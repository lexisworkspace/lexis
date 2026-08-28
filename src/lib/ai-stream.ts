"use client";

import { AIMessage, AIModel, AISource } from "@/types";
import { chat, buildStatsBlock, buildProfileBlock, buildNoorBlock, ChatOpts, withAttachmentContext } from "./ai";
import { getToday } from "./utils";

const FALLBACK_MODELS: Record<string, string[]> = {
  "nvidia/nemotron-3-ultra-550b-a55b": ["nvidia/nemotron-3-super-120b-a12b"],
  "nvidia/nemotron-3-super-120b-a12b": ["nvidia/nemotron-3-ultra-550b-a55b"],
};
import { buildSearchBlock, isLiveQuery } from "./web-search";
import { getSituationPayload } from "@/lib/graph/engine";
import { MODEL_PROFILES } from "./ai-models";
import { countFactInstruction } from "./count-guard";
import { jailbreakOverride, jailbreakQueryReplacement } from "./jailbreak-guard";
import {
  detectAction,
  executeAction,
  tryExecuteJsonAction,
  processActionReply,
  stripActionRemnants,
  ACTION_MARKER_VARIANTS,
} from "./ai-actions";

/**
 * Stream tokens from the LLM over SSE (proxied through /api/chat).
 * Returns the full reply text, or null on any failure.
 */
async function streamLLM(
  query: string,
  conversationHistory: AIMessage[],
  modelId: AIModel,
  signal: AbortSignal | undefined,
  onToken: (delta: string) => void,
  opts?: ChatOpts
): Promise<string | null> {
  const model = MODEL_PROFILES[modelId];
  if (!model) return null;

  const stats = buildStatsBlock(model.analysisDepth);
  const profileBlock = buildProfileBlock();
  const noorBlock = buildNoorBlock();
  const searchBlock = buildSearchBlock(opts?.sources || []);
  const systemPrompt = `${model.systemPrompt}\n\nToday is ${getToday()}.\n\n${stats}${profileBlock}${noorBlock}${searchBlock}`;

  // Never feed JSON-looking assistant replies back to the model.
  const history = conversationHistory
    .slice(-model.maxContextMessages)
    .filter((m) => {
      if (m.role !== "assistant") return true;
      const t = (m.content || "").trim();
      return !/^\{\s*["']/.test(t) && !/^```(?:json)?/i.test(t);
    });
  const payloadMessages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: withAttachmentContext(m) })),
    { role: "user", content: query },
  ];
  // Deterministic letter-count guard: if the user asks "how many X's in Y",
  // inject the exact count so the model never guesses (see count-guard.ts).
  const countFact = countFactInstruction(query);
  if (countFact) {
    payloadMessages.push({ role: "system", content: countFact });
  }
  // Jailbreak guard: if the message is an identity-change/override attempt,
  // inject a hard override so even small models cannot comply.
  const jailbreakNote = jailbreakOverride(query);
  if (jailbreakNote) {
    payloadMessages.push({ role: "system", content: jailbreakNote });
  }
  // Reveal/repeat attacks: swap the user query for a safe instruction so the
  // model has nothing to leak even on small models.
  const safeQuery = jailbreakQueryReplacement(query);
  if (safeQuery) {
    const last = payloadMessages[payloadMessages.length - 1];
    if (last && last.role === "user") {
      payloadMessages[payloadMessages.length - 1] = { role: "user", content: safeQuery };
    }
  }

  try {
    // Try primary model, then fallbacks
    let res: Response | null = null;
    let triedModel = model.nvidiaModelId;
    const fallbacks = FALLBACK_MODELS[model.nvidiaModelId] || [];
    const modelsToTry = [model.nvidiaModelId, ...fallbacks];
    
    for (const tryModel of modelsToTry) {
      try {
        const attempt = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: tryModel,
        messages: payloadMessages,
        temperature: model.temperature,
        maxTokens: model.maxTokens,
        stream: true,
        situation: getSituationPayload(),
      }),
      signal,
    });
    if (attempt.ok && attempt.body) { res = attempt; triedModel = tryModel; break; }
      } catch { /* try next */ }
    }
    if (!res || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            full += delta;
            onToken(delta);
          }
        } catch {
          /* skip malformed frames */
        }
      }
    }
    return full.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Streaming chat - built for voice mode so Noor can start speaking the
 * moment the first sentence is ready (rapid, natural back-and-forth).
 * - Fast local actions execute instantly (one emit).
 * - Then the LLM streams token-by-token via onToken.
 * - Falls back to the local engine on any failure, so voice mode always answers.
 */
export interface StreamOpts {
  onToken: (delta: string) => void;
  signal?: AbortSignal;
  sources?: AISource[];
}

export async function chatStream(
  query: string,
  conversationHistory: AIMessage[] = [],
  modelId: AIModel = "logos-4.5",
  opts: StreamOpts
): Promise<string> {
  const model = MODEL_PROFILES[modelId];
  if (!model) {
    const msg = "Invalid model selected. Please choose Ethos 4.7, Logos 4.5, or Verse 4.";
    opts.onToken(msg);
    return msg;
  }

  // Fast local actions first - the user asked us to DO something, do it now.
  // Live queries (news, release dates, prices, AI model news...) must reach
  // the LLM with web results instead - never let a local action hijack them.
  const action = isLiveQuery(query)
    ? { matched: false, type: null, params: {}, confidence: 0 }
    : detectAction(query);
  if (action.matched && action.confidence >= 0.7) {
    const result = executeAction(action);
    opts.onToken(result.message);
    return result.message;
  }

  // Streaming LLM - the rapid path. The token stream passes through a small
  // state machine: a LEXIS_ACTION { ... } block the model emits is executed
  // for real and its JSON is replaced by a natural confirmation BEFORE it
  // reaches the UI or the voice pipeline (voice mode must never read raw
  // JSON aloud, and the action must actually happen - never just claimed).
  // The marker can arrive split across token chunks, so any suffix of the
  // stream that could still be the start of a marker is held back. The marker
  // itself is matched fuzzily (missing X, space/hyphen/no separator) so a
  // misspelled marker still gets intercepted instead of leaking raw JSON.
  let actionText = "";
  let handledAction = false;
  let pending = "";
  let inAction = false;
  let actionBuf = "";
  let sawMarker = false;
  const MAX_MARKER_LEN = Math.max(...ACTION_MARKER_VARIANTS.map((m) => m.length));
  const emit = (t: string) => {
    if (!t) return;
    actionText += t;
    opts.onToken(t);
  };

  // The LEXIS_ACTION marker interceptor - the only path visible text takes.
  const handleVisible = (delta: string) => {
    if (inAction) {
      actionBuf += delta;
      finishAction();
      return;
    }
    pending += delta;
    const lower = pending.toLowerCase();
    // Earliest marker variant wins (e.g. prose before the marker is kept).
    let markerIdx = -1;
    for (const m of ACTION_MARKER_VARIANTS) {
      const i = lower.indexOf(m);
      if (i >= 0 && (markerIdx < 0 || i < markerIdx)) markerIdx = i;
    }
    if (markerIdx >= 0) {
      sawMarker = true;
      emit(pending.slice(0, markerIdx));
      actionBuf = pending.slice(markerIdx);
      pending = "";
      inAction = true;
      finishAction();
      return;
    }
    // No full marker yet - hold back any suffix that could be its start.
    let holdLen = 0;
    const maxHold = Math.min(pending.length, MAX_MARKER_LEN);
    for (let k = 1; k <= maxHold; k++) {
      const suffix = lower.slice(lower.length - k);
      if (ACTION_MARKER_VARIANTS.some((m) => m.startsWith(suffix))) holdLen = k;
    }
    emit(pending.slice(0, pending.length - holdLen));
    pending = pending.slice(pending.length - holdLen);
  };

  const finishAction = () => {
    const brace = actionBuf.indexOf("{");
    if (brace < 0) return; // JSON hasn't started yet - keep buffering
    let depth = 0;
    for (let i = brace; i < actionBuf.length; i++) {
      const ch = actionBuf[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const json = actionBuf.slice(brace, i + 1);
          const rest = actionBuf.slice(i + 1);
          inAction = false;
          actionBuf = "";
          const confirmation = tryExecuteJsonAction(json);
          if (confirmation) {
            handledAction = true;
            emit(confirmation);
          }
          // Text after the block can itself contain another (possibly
          // truncated) marker - never let raw JSON reach the UI.
          if (rest) emit(stripActionRemnants(rest));
          return;
        }
      }
    }
    // JSON not closed yet - keep buffering.
  };
  try {
    const text = await streamLLM(query, conversationHistory, modelId, opts.signal, (delta) => {
      handleVisible(delta);
    }, opts);
    // Flush any held-back visible text at stream end.
    if (pending) handleVisible(pending);

    // Marker started but never closed - the action never completed.
    const truncatedAction = sawMarker && !handledAction;
    inAction = false;
    actionBuf = "";
    if (pending) emit(pending);
    pending = "";
    // Already executed + filtered in the stream - return the clean text.
    if (handledAction) return actionText;
    // The action never completed: always tell the user honestly, even when
    // the model wrote prose before the marker (never a silent "Sure!" lie).
    if (truncatedAction) {
      const note = "I couldn't finish setting that up. Mind asking me again?";
      if (actionText.trim()) {
        actionText += "\n\n" + note;
        opts.onToken("\n\n" + note);
      } else {
        opts.onToken(note);
        actionText = note;
      }
      return actionText;
    }
    if (text) {
      // Safety net: strip any stray think tags before processing/returning.
      const t = text.replace(/<\/?think>/gi, "").trim();
      // Safety net for an action that arrived whole and was not intercepted:
      // execute it for real, never show raw JSON.
      const processed = processActionReply(t);
      if (processed) return processed;
      const handled = tryExecuteJsonAction(t);
      if (handled) {
        opts.onToken(handled);
        return handled;
      }
      // Final net: never let a raw/truncated LEXIS_ACTION line reach the UI.
      const cleaned = stripActionRemnants(t);
      if (cleaned) return cleaned;
      return t;
    }
    // If streamLLM returned null (all fallbacks failed) and nothing was emitted,
    // fall through to the local engine below.
    if (!actionText.trim()) throw new Error("stream_null");
    return actionText;
  } catch {
    /* fall through to the local engine */
  }

  // The round was cancelled - don't waste a full LLM request on a reply
  // the user no longer wants.
  if (opts.signal?.aborted) return "";

  // Offline-safe local engine fallback - emit the whole reply at once.
  const fallback = await chat(query, conversationHistory, modelId, opts);
  opts.onToken(fallback);
  return fallback;
}
