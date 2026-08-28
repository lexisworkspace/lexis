"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Send,
  Mic,
  Square,
  Loader2,
  CheckCircle2,
  Plus,
  MessageSquare,
  ChevronDown,
  X as XIcon,
  Trash2,
  PanelRight,
  Menu,
  RefreshCw,
  Copy as CopyIcon,
  Check,
  Pencil,
  Pin,
  Search,
  Zap,
  Download,
  FileText,
  BookOpen,
  CheckSquare,
  Flame,
  Globe,
  ImagePlus,
  Paperclip,
} from "lucide-react";
import { storage } from "@/lib/storage";
import { buildSituationModel } from "@/lib/graph/situation";
import { getGraph } from "@/lib/graph/engine";
import { chat } from "@/lib/ai";
import { sanitizeStoredReply } from "@/lib/ai-actions";
import { chatStream } from "@/lib/ai-stream";
import { isLiveQuery } from "@/lib/web-search";
import { cn, generateId } from "@/lib/utils";
import { useMobile } from "@/hooks/useMobile";
import { AIMessage, AIModel, AI_MODELS, MODEL_ALIASES, BriefAction, AISource } from "@/types";
import { Markdown } from "@/components/chat/Markdown";
import { useI18n } from "@/lib/i18n";
import { useVoiceDictation } from "@/lib/useVoiceDictation";
import { VoiceOrb } from "@/components/assistant/VoiceOrb";
import { VoiceModeOverlay } from "@/components/assistant/VoiceModeOverlay";
import { getVoicePersona, speak, stopSpeaking, playOrbSound, pickVoice, warmUpSpeech, beginVoiceTurn } from "@/lib/voices";

const MODEL_META: Record<string, string> = {
  "ethos-4.7": "Ethos 4.7",
  "logos-4.5": "Logos 4.5",
  "verse-4": "Verse 4",
};

// Resolve any stored model id (including legacy ids from old conversations)
function resolveModelId(id: string): string {
  return MODEL_ALIASES[id] || (MODEL_META[id] ? id : "logos-4.5");
}

function msgLabel(id?: string): string {
  return MODEL_META[resolveModelId(id || "logos-4.5")] || "Logos 4.5";
}

interface Attachment {
  id: string;
  kind: "image" | "file";
  name: string;
  size: number;
  dataUrl: string;
  text?: string;
  description?: string;
}

// "make an image of X" / "image: X" -> image generation
function isImageRequest(q: string): boolean {
  const t = q.trim().toLowerCase();
  // Explicit "image: <prompt>" - require a real subject after the colon.
  if (/^(image|img|draw|generate)\s*[:：]\s*/.test(t)) {
    return t.replace(/^(image|img|draw|generate)\s*[:：]\s*/, "").trim().length >= 4;
  }
  if (/(how do i|how to|what is|what's|explain|tutorial|best|compare)\b/.test(t)) return false;
  const m = t.match(
    /(^|\s)(generate|create|make|draw|render|imagine|produce)\s+(me\s+|us\s+|an?\s+|a\s+)?(image|picture|photo|logo|art|illustration|poster|meme|drawing|icon|artwork|graphic)\b/
  );
  if (!m) return false;
  // Require an actual subject: "make an image of a fox" triggers, but a bare
  // correction like "no, generate an image" does not - it falls back to chat.
  const rest = t.slice((m.index || 0) + m[0].length).trim();
  return rest.length >= 3 && /\s[a-z]{2,}/.test(rest);
}

function cleanImagePrompt(q: string): string {
  return q
    .replace(/^(no|nah|nope|nvm|nevermind)[,!\s]+/i, "")
    .replace(/^(image|img|draw|generate)\s*[:：]\s*/i, "")
    .replace(/[.。!?]+$/g, "")
    .trim() || q.trim();
}

function sourceIcon(kind: AISource["kind"]) {
  switch (kind) {
    case "document":
      return <FileText className="h-3 w-3 text-primary-500" />;
    case "journal":
      return <BookOpen className="h-3 w-3 text-violet-500" />;
    case "task":
      return <CheckSquare className="h-3 w-3 text-emerald-500" />;
    case "habit":
      return <Flame className="h-3 w-3 text-zinc-400" />;
    case "web":
      return <Globe className="h-3 w-3 text-sky-500" />;
  }
}

const SAFE_MODEL: AIModel = "logos-4.5";

// Text files shorter than this are sent to the model verbatim; longer ones
// are digested into an overview first (see /api/overview) so Noor understands
// the whole file without blowing the context window.
const FILE_INLINE_CHARS = 12_000;

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

// ============================================================
// Streaming speech helpers
// ============================================================

// Split accumulated stream text into finished sentences + leftover buffer.
function splitStreamText(text: string): { done: string[]; rest: string } {
  const done: string[] = [];
  let rest = text;
  const re = /.*?[.!?\n]+(?:\s|$)/g;
  let m: RegExpExecArray | null;
  let guard = 0;
  while (guard++ < 50 && (m = re.exec(rest)) !== null) {
    const seg = m[0].trim();
    if (seg) done.push(seg);
    rest = rest.slice(m.index + m[0].length).trimStart();
    re.lastIndex = 0;
  }
  return { done, rest: rest.trim() };
}

export default function AssistantPage() {
  const { t } = useI18n();
  const [data, setData] = useState(storage.getData());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(getSafeModel(data.selectedModel));
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showChats, setShowChats] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [missed, setMissed] = useState(false);
  const [liveReply, setLiveReply] = useState("");
  const reduceMotion = useReducedMotion();
  const isMobile = useMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesBoxRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [composerMultiline, setComposerMultiline] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [fastMode, setFastMode] = useState(false);
  const [webMode, setWebMode] = useState(false);
  const [searching, setSearching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [branchingId, setBranchingId] = useState<string | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Web search: when the toggle is on, fetch live results before answering.
  const fetchWebSources = async (q: string): Promise<AISource[]> => {
    setSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: q.slice(0, 300) }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        results?: { title: string; url: string; snippet: string }[];
      };
      return (data.results || []).map((r) => ({
        kind: "web" as const,
        id: r.url,
        title: r.title,
        snippet: r.snippet,
        href: r.url,
      }));
    } catch {
      return [];
    } finally {
      setSearching(false);
    }
  };

  // Describe an attached image via the vision model so Noor can "see" it.
  const describeImage = async (dataUrl: string): Promise<string> => {
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      if (!res.ok) return "";
      const data = (await res.json()) as { description?: string };
      return (data.description || "").trim();
    } catch {
      return "";
    }
  };

  // Summarize a large text file server-side (chunked map-reduce) so Noor
  // understands the WHOLE file, not just its first few thousand characters.
  const buildFileOverview = async (name: string, text: string): Promise<string> => {
    try {
      const res = await fetch("/api/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, title: name }),
      });
      if (!res.ok) return "";
      const data = (await res.json()) as { overview?: string };
      return (data.overview || "").trim();
    } catch {
      return "";
    }
  };

  const handleAttachImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const next: Attachment[] = [];
    for (const f of files.slice(0, 4)) {
      if (f.size > 5 * 1024 * 1024) continue;
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ""));
        r.readAsDataURL(f);
      });
      next.push({ id: generateId(), kind: "image", name: f.name, size: f.size, dataUrl });
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  };

  const handleAttachFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const next: Attachment[] = [];
    // Big files are supported now - Noor digests them chunk-by-chunk
    // (see /api/overview). We only read the first ~500KB of text into
    // memory; that's more than enough to overview anything realistic.
    const MAX_FILE_BYTES = 25 * 1024 * 1024;
    const MAX_FILE_CHARS = 500_000;
    for (const f of files.slice(0, 2)) {
      if (f.size > MAX_FILE_BYTES) continue;
      const isText =
        f.type.startsWith("text/") ||
        /\.(txt|md|json|csv|ts|tsx|js|jsx|py|html|css|log|ini|yml|yaml|xml)$/i.test(f.name);
      let text: string | undefined;
      if (isText) {
        text = await f.slice(0, MAX_FILE_CHARS).text().catch(() => "");
        if (!text) text = undefined;
        else if (f.size > MAX_FILE_CHARS) {
          text += `\n...(file is ${formatBytes(f.size)}; showing the first ${MAX_FILE_CHARS.toLocaleString()} characters)`;
        }
      }
      next.push({ id: generateId(), kind: "file", name: f.name, size: f.size, dataUrl: "", text });
    }
    if (next.length) setAttachments((prev) => [...prev, ...next]);
  };

  // When the composer wraps to multiple lines, drop the pill radius so the text
  // is never clipped by the fully-rounded corners (pill -> rounded rectangle).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const check = () => {
      const cs = getComputedStyle(el);
      const lineH = parseFloat(cs.lineHeight) || 20;
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      setComposerMultiline(el.offsetHeight > lineH + pad + 4);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const voiceActiveRef = useRef(false);
  voiceActiveRef.current = voiceActive;
  const voiceModeOpenRef = useRef(false);
  voiceModeOpenRef.current = voiceModeOpen;
  const voiceRoundRef = useRef(false); // true when a recording round was started by voice mode
  const speakRoundRef = useRef(false); // true when a mic round should speak the reply back
  // Streaming voice reply state
  const voiceStreamRef = useRef<AbortController | null>(null);
  const streamFullRef = useRef("");
  const streamDoneRef = useRef(true);
  const speakSegmentsRef = useRef<string[]>([]);
  const speakingSegmentRef = useRef(false);

  const LANG_MAP: Record<string, string> = {
    en: "en-US",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    pt: "pt-PT",
    ar: "ar-SA",
  };
  const speechLang = LANG_MAP[data.theme.language || "en"] || "en-US";
  const handleVoiceFinal = (text: string) => {
    // If the immersive interface was closed while transcribing, drop the round.
    if (voiceRoundRef.current && !voiceModeOpenRef.current) return;
    // Mic dictation is a TEXT round - Noor replies in text, never speaks back.
    speakRoundRef.current = false;
    // Silence or empty transcription - give a gentle hint instead of nothing.
    if (!text.trim()) {
      if (voiceModeOpenRef.current) setMissed(true);
      return;
    }
    setMissed(false);
    // Mic dictation: Noor "types back" - the words land in the composer as
    // typed text for the user to review before sending (never spoken back).
    // If the composer already has text, append instead of replacing it.
    if (!voiceRoundRef.current) {
      setInput((prev) => {
        const base = prev.trim();
        return base ? base.replace(/\s+$/, "") + " " + text : text;
      });
      if (inputRef.current) {
        inputRef.current.focus();
        // Resize after React applies the new value - reading scrollHeight
        // synchronously here would measure the stale (old) textarea.
        requestAnimationFrame(() => {
          const el = inputRef.current;
          if (!el) return;
          el.style.height = "auto";
          el.style.height = Math.min(el.scrollHeight, 160) + "px";
        });
      }
      return;
    }
    // Immersive voice mode: send the round (spoken reply) as before.
    if (loading) return;
    voiceRoundRef.current = false; // round fully handled
    void sendMessage(text);
  };
  const {
    supported: voiceSupported,
    listening: voiceListening,
    processing: voiceProcessing,
    duration: voiceDuration,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
    formatDuration,
  } = useVoiceDictation({ lang: speechLang, onFinal: handleVoiceFinal });

  // Speak queued segments in BATCHES: each speak() call fetches one TTS
  // request per chunk, and Magpie is capped at ~15 req/min - speaking one
  // sentence at a time used to blow the budget and flip Noor to the robotic
  // device voice mid-reply. Buffer sentences until we have ~1200 chars queued
  // (or the stream ends) and speak them together in one call.
  const pumpSpeech = () => {
    if (speakingSegmentRef.current) return;
    const q = speakSegmentsRef.current;
    if (!q.length) {
      if (streamDoneRef.current) {
        setSpeaking(false);
        // Auto-restart listening for hands-free conversation
        if (voiceModeOpenRef.current && voiceRoundRef.current === false) {
          voiceRoundRef.current = true;
          setMissed(false);
          setTimeout(() => {
            if (voiceModeOpenRef.current) startVoice();
          }, 800);
        }
      }
      return;
    }
    let batch = "";
    while (q.length) {
      const next = q[0]!;
      if (batch && batch.length + next.length > 1200) break;
      batch += (batch ? " " : "") + q.shift()!;
    }
    if (!batch.trim()) batch = q.shift() || "";
    if (!batch.trim()) {
      if (streamDoneRef.current) setSpeaking(false);
      return;
    }
    speakingSegmentRef.current = true;
    setSpeaking(true);
    const p = getVoicePersona(storage.getData().theme.voiceId);
    speak(batch.trim(), p, storage.getData().theme.language || "en", () => {
      speakingSegmentRef.current = false;
      if (speakSegmentsRef.current.length) {
        pumpSpeech();
      } else if (streamDoneRef.current) {
        setSpeaking(false);
      }
    });
  };

  // Stop current speech + clear the streaming state (interrupt/close).
  const resetVoiceSpeech = () => {
    // Clear refs BEFORE stopSpeaking() - stopSpeaking fires the active
    // speak()'s onEnd synchronously, and that callback must not find a
    // full queue (it would start speaking a stale segment).
    speakingSegmentRef.current = false;
    speakSegmentsRef.current = [];
    streamDoneRef.current = true;
    stopSpeaking();
    setSpeaking(false);
  };

  const closeVoiceMode = () => {
    voiceRoundRef.current = false;
    setMissed(false);
    voiceStreamRef.current?.abort();
    stopVoice();
    resetVoiceSpeech();
    setVoiceActive(false);
    setVoiceModeOpen(false);
  };

  const toggleVoiceMode = () => {
    if (loading || voiceProcessing) return;
    if (!voiceSupported) return;
    if (voiceModeOpen) {
      closeVoiceMode();
      return;
    }
    voiceStreamRef.current?.abort();
    resetVoiceSpeech();
    setMissed(false);
    // Warm up the device voice list + unlock iOS speech (needs a gesture).
    beginVoiceTurn(); // defense in depth: a fresh voice round is a fresh turn
    warmUpSpeech();
    setVoiceActive(true);
    setVoiceModeOpen(true);
    voiceRoundRef.current = true;
    playOrbSound();
    startVoice();
  };

  // Tap the orb in the immersive interface: start/stop a listening round,
  // or interrupt Noor's reply and start a new one.
  const handleOrbTap = () => {
    if (loading || voiceProcessing) return;
    if (voiceListening) {
      stopVoice(); // stop -> transcribe -> send
      return;
    }
    setMissed(false);
    warmUpSpeech();
    if (speaking) {
      voiceStreamRef.current?.abort();
      resetVoiceSpeech();
      voiceRoundRef.current = true;
      startVoice();
      return;
    }
    voiceRoundRef.current = true;
    startVoice();
  };

  function getSafeModel(m: unknown): AIModel {
    if (typeof m === "string") {
      if (AI_MODELS.some((x) => x.id === m)) return m as AIModel;
      const aliased = MODEL_ALIASES[m];
      if (aliased) return aliased;
    }
    return SAFE_MODEL;
  }

  // Auto-interrupt: when user starts talking while Noor is speaking, stop speech
  useEffect(() => {
    if (voiceListening && speaking && voiceModeOpenRef.current) {
      voiceStreamRef.current?.abort();
      resetVoiceSpeech();
    }
  }, [voiceListening, speaking]);

  const refresh = () => setData({ ...storage.getData() });
  useEffect(() => storage.subscribe(() => setData({ ...storage.getData() })), []);

  useEffect(() => {
    // Scroll only the chat's own scroll container, never the page window.
    const box = messagesBoxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) {
        setPlusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => () => { voiceStreamRef.current?.abort(); stopSpeaking(); }, []);

  useEffect(() => {
    if (voiceSupported) {
      pickVoice(getVoicePersona(storage.getData().theme.voiceId), storage.getData().theme.language || "en");
    }
  }, [voiceSupported]);

  const startNewChat = () => {
    const conv = storage.createConversation();
    setConversationId(conv.id);
    setMessages([]);
    refresh();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const loadConversation = (id: string) => {
    const conv = data.aiConversations.find((c) => c.id === id);
    if (conv) {
      // Belt and braces: never render a stored raw action block, even if a
      // conversation predates the filters or was written by another path.
      const cleaned = conv.messages.map((m) =>
        m.role === "assistant" ? { ...m, content: sanitizeStoredReply(m.content) } : m
      );
      setConversationId(id);
      setMessages(cleaned);
      if (cleaned.some((m, i) => m.content !== conv.messages[i].content)) {
        storage.replaceConversationMessages(id, cleaned);
      }
    }
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const appData = storage.getData();
    appData.aiConversations = appData.aiConversations.filter((c) => c.id !== id);
    storage.saveData();
    if (conversationId === id) {
      setConversationId(null);
      setMessages([]);
    }
    refresh();
  };

  // ---------- Phase 1: conversation tools ----------

  const togglePin = (id: string) => {
    const conv = storage.getData().aiConversations.find((c) => c.id === id);
    if (!conv) return;
    storage.updateConversation(id, { pinned: !conv.pinned });
    refresh();
  };

  const copyMessage = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    const title = storage
      .getData()
      .aiConversations.find((c) => c.id === conversationId)?.title || "Noor chat";
    const lines = messages.map((m) => {
      const who = m.role === "user" ? "You" : `Noor (${msgLabel(m.model)})`;
      const body = m.content.trim();
      return `## ${who}\n\n${body}`;
    });
    const md = `# ${title}\n\n${lines.join("\n\n---\n\n")}\n`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "noor-chat"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Edit a past user message -> truncate the conversation there, then resend.
  const saveEdit = async (msgId: string) => {
    const text = editText.trim();
    if (!text || loading) return;
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const userMsg: AIMessage = {
      ...messages[idx],
      content: text,
    };
    const branch = messages.slice(0, idx).concat(userMsg);
    setEditingId(null);
    setEditText("");
    setBranchingId(msgId);
    if (conversationId) storage.replaceConversationMessages(conversationId, branch);
    setMessages(branch);
    await runReply(text, branch, true);
    setBranchingId(null);
  };

  // Regenerate an assistant reply: truncate after its triggering user message
  // and resend that prompt.
  const regenerate = async (assistantId: string) => {
    if (loading) return;
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx === -1) return;
    let userIdx = idx - 1;
    while (userIdx >= 0 && messages[userIdx].role !== "user") userIdx--;
    if (userIdx < 0) return;
    const userMsg = messages[userIdx];
    const branch = messages.slice(0, userIdx + 1);
    setBranchingId(assistantId);
    if (conversationId) storage.replaceConversationMessages(conversationId, branch);
    setMessages(branch);
    await runReply(userMsg.content, branch, false);
    setBranchingId(null);
  };

  // Core reply runner shared by sendMessage / saveEdit / regenerate.
  const runReply = async (
    queryText: string,
    msgs: AIMessage[],
    branchMode: boolean
  ): Promise<void> => {
    setLoading(true);
    setLiveReply("");
    const model = fastMode ? "verse-4" : selectedModel;
    let sources: AISource[] = [];
    if (webMode || isLiveQuery(queryText)) sources = await fetchWebSources(queryText);
    let response: string;
    try {
      // Stream so Ethos/Logos feel as fast as Verse - tokens appear live.
      setLiveReply("");
      let acc = "";
      response = await chatStream(queryText, msgs, model, {
        sources,
        onToken: (delta) => {
          acc += delta;
          setLiveReply(acc);
        },
      });
    } catch {
      setLiveReply("");
      setLoading(false);
      const errMsg: AIMessage = {
        id: generateId(),
        role: "assistant",
        content: "I could not reach my models just now - try again in a moment.",
        timestamp: new Date().toISOString(),
        model,
      };
      const updated = [...msgs, errMsg];
      setMessages(updated);
      if (conversationId) storage.replaceConversationMessages(conversationId, updated);
      refresh();
      return;
    }
    const aiMsg: AIMessage = {
      id: generateId(),
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
      model,
      branch: branchMode || undefined,
      sources: sources.length ? sources : undefined,
    };
    const updated = [...msgs, aiMsg];
    setMessages(updated);
    if (conversationId) storage.replaceConversationMessages(conversationId, updated);
    setLiveReply("");
    setLoading(false);
    refresh();
  };

  const changeModel = (model: AIModel) => {
    setSelectedModel(model);
    setShowModelPicker(false);
    const appData = storage.getData();
    appData.selectedModel = model;
    storage.saveData();
  };

  // Daily brief: Noor summarizes the situation model (risks, mentions, mood).
  const DAILY_BRIEF_PROMPT =
    "Give me my daily brief. Using the situation block in your context, " +
    "write 4-6 short lines covering: (1) anything at risk right now - at-risk habit streaks " +
    "or overdue tasks, (2) tasks I keep mentioning but haven't finished, (3) my mood trend " +
    "if known, (4) one concrete thing I should do first today. Be warm, direct, like a mentor. " +
    "No bullet spam - keep it human.";

  // A brief action is 'done' when its effect is already visible in storage -
  // this survives reloads and makes repeated clicks idempotent.
  const actionDone = (a: BriefAction): boolean => {
    const appData = storage.getData();
    if (a.type === "log-habit") return storage.isHabitLogged(a.id!);
    if (a.type === "complete-task") {
      const tk = appData.tasks.find((x) => x.id === a.id!);
      return !!tk && tk.status === "done";
    }
    if (a.type === "break-down") {
      const parent = appData.tasks.find((x) => x.id === a.id!);
      if (!parent) return false;
      return appData.tasks.some((x) => x.title === `Plan: ${parent.title}`);
    }
    return false;
  };

  // Tap-through actions for the brief, computed locally from the situation
  // model - deterministic, instant, private (no extra API call).
  const buildBriefActions = (): BriefAction[] => {
    const appData = storage.getData();
    const situation = buildSituationModel(appData, getGraph());
    const actions: BriefAction[] = [];
    // At-risk habit streaks -> Log today
    for (const r of situation.risks) {
      if (r.kind === "habit") {
        actions.push({ type: "log-habit", id: r.id, label: `Log ${r.title}`, detail: r.detail });
      } else {
        actions.push({ type: "break-down", id: r.id, label: `Break down ${r.title}`, detail: r.detail });
        actions.push({ type: "complete-task", id: r.id, label: `Done: ${r.title}` });
      }
    }
    // Repeatedly mentioned but not overdue tasks -> offer a breakdown
    for (const m of situation.taskMentions) {
      if (m.score >= 3 && !actions.some((a) => a.id === m.id)) {
        actions.push({
          type: "break-down",
          id: m.id,
          label: `Break down ${m.title}`,
          detail: `Mentioned ${m.count}x${m.recent ? `, ${m.recent} recent` : ""}`,
        });
      }
    }
    return actions.slice(0, 6);
  };

  const handleBriefAction = (a: BriefAction) => {
    if (actionDone(a)) return; // idempotent: storage state is the source of truth
    const appData = storage.getData();
    if (a.type === "log-habit") {
      storage.logHabit(a.id!);
    } else if (a.type === "complete-task") {
      storage.updateTask(a.id!, { status: "done", completedAt: new Date().toISOString() });
    } else if (a.type === "break-down") {
      // Create 3 focused subtasks, linked to the parent in the graph.
      const parent = appData.tasks.find((t) => t.id === a.id!);
      const base = parent?.title || (a.label || "").replace(/^Break down /, "");
      const steps = ["Plan", "Do the core work", "Review & finish"];
      for (const step of steps) {
        const sub = storage.createTask({
          title: `${step}: ${base}`,
          description: `Sub-step of "${base}" (from your daily brief).`,
          status: "todo",
          priority: "medium",
          dueDate: parent?.dueDate || null,
          dueTime: null,
          tags: [],
          listId: parent?.listId || "inbox",
          recurring: "none",
          recurringEndDate: null,
          estimatedMinutes: null,
          completedAt: null,
        });
        storage.linkEntities(`task:${a.id}`, `task:${sub.id}`);
      }
    }
    refresh();
  };

  const requestDailyBrief = () => {
    void sendMessage(DAILY_BRIEF_PROMPT, { actions: buildBriefActions() });
  };
  const sendMessage = async (textOverride?: string, opts?: { actions?: BriefAction[] }) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    // New reply turn: reset the sticky device-voice fallback so this reply
    // starts fresh on the premium neural voice (no mid-reply voice flips).
    beginVoiceTurn();

    let currentConvId = conversationId;
    if (!currentConvId) {
      const conv = storage.createConversation();
      currentConvId = conv.id;
      setConversationId(conv.id);
      refresh();
    }

    const userMsg: AIMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      model: selectedModel,
      attachments: attachments.length
        ? attachments.map(({ kind, name, dataUrl }) => ({ kind, name, dataUrl }))
        : undefined,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    const queryText = text;
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);

    // Enrich attachments once - used for this reply AND persisted on the
    // message so follow-up questions in the conversation remember them:
    // images get a vision description, big text files get a full-file overview.
    let llmQuery = queryText;
    if (attachments.length > 0) {
      const enriched: Attachment[] = await Promise.all(
        attachments.map(async (att) => {
          if (att.kind === "image") {
            const desc = await describeImage(att.dataUrl);
            return { ...att, description: desc || undefined };
          }
          if (att.kind === "file" && att.text && att.text.length > FILE_INLINE_CHARS) {
            const digest = await buildFileOverview(att.name, att.text);
            if (digest) return { ...att, description: digest };
            // Overview failed - inline the head so the reply still has context.
            return {
              ...att,
              description: undefined,
              text: att.text.slice(0, FILE_INLINE_CHARS) + "\n...(file too large to inline fully - this is its beginning)",
            };
          }
          return att;
        })
      );
      userMsg.attachments = enriched.map(({ kind, name, dataUrl, description }) => ({
        kind,
        name,
        dataUrl,
        description,
      }));
      const parts: string[] = [];
      for (const att of enriched) {
        if (att.kind === "image") {
          parts.push(`[Attached image "${att.name}"${att.description ? `] ${att.description}` : " - could not be described"}`);
        } else if (att.text) {
          // Long files arrive here as an overview digest instead of raw text.
          const body = att.description || att.text;
          parts.push(`[Attached file "${att.name}"${att.description ? " - full-file overview" : ""}]\n${body}`);
        } else {
          parts.push(`[Attached file "${att.name}" - binary file, contents unavailable]`);
        }
      }
      llmQuery = `${queryText}\n\n---\nUser attached:\n${parts.join("\n\n")}`;
      setAttachments([]);
    }

    let sources: AISource[] = [];
    if (webMode || isLiveQuery(queryText)) sources = await fetchWebSources(queryText);
    const sendOpts = {
      sources,
    };

    storage.addMessage(currentConvId, userMsg);

    // Voice rounds: stream from Verse (fastest) and speak sentence-by-sentence.
    const isVoiceRound = voiceActiveRef.current || speakRoundRef.current;
    speakRoundRef.current = false;

    // Image generation: "make an image of X" / "image: X" -> generate & skip the LLM.
    if (!isVoiceRound && attachments.length === 0 && isImageRequest(queryText)) {
      setGeneratingImage(true);
      const prompt = cleanImagePrompt(queryText);
      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = (await res.json()) as { imageDataUrl?: string };
        if (res.ok && data.imageDataUrl) {
          const imgMsg: AIMessage = {
            id: generateId(),
            role: "assistant",
            content: "Here you go - I generated that image for you. Want me to tweak it or make another one?",
            timestamp: new Date().toISOString(),
            model: selectedModel,
            image: { dataUrl: data.imageDataUrl, prompt },
          };
          storage.addMessage(currentConvId, imgMsg);
          setMessages((prev) => [...prev, imgMsg]);
          setLiveReply("");
          setLoading(false);
          setGeneratingImage(false);
          refresh();
          return;
        }
      } catch {
        // Image generation failed - fall through to a normal chat reply.
      }
      setGeneratingImage(false);
    }

    let response: string;
    if (isVoiceRound) {
      const ctrl = new AbortController();
      voiceStreamRef.current = ctrl;
      streamFullRef.current = "";
      speakSegmentsRef.current = [];
      speakingSegmentRef.current = false;
      streamDoneRef.current = false;
      setLiveReply("");
      try {
        response = await chatStream(llmQuery, updatedMessages, "verse-4", {
          signal: ctrl.signal,
          ...sendOpts,
          onToken: (delta) => {
            if (ctrl.signal.aborted) return;
            streamFullRef.current += delta;
            setLiveReply(streamFullRef.current);
            // Queue completed sentences for speech immediately.
            const { done, rest } = splitStreamText(streamFullRef.current);
            let buffer = rest;
            // Keep the voice moving: if the pending buffer grows long without
            // a full stop, cut it at a comma or space so speech starts sooner.
            if (buffer.length > 140) {
              const comma = buffer.lastIndexOf(", ", 120);
              const space = buffer.lastIndexOf(" ", 120);
              const at = comma > 60 ? comma + 1 : space > 60 ? space : buffer.length;
              if (at > 60 && at < buffer.length) {
                done.push(buffer.slice(0, at).trim());
                buffer = buffer.slice(at).trim();
              }
            }
            streamFullRef.current = buffer;
            for (const seg of done) {
              // Never let a raw action marker/JSON be read aloud - strip any
              // remnant before the segment can reach the TTS pipeline.
              const clean = sanitizeStoredReply(seg);
              if (clean.length >= 2) speakSegmentsRef.current.push(clean);
            }
            pumpSpeech();
          },
        });
      } catch {
        // Any streaming failure: fall back to the plain fast path.
        response = await chat(llmQuery, updatedMessages, "verse-4");
      } finally {
        voiceStreamRef.current = null;
        streamDoneRef.current = true;
      }
      if (ctrl.signal.aborted) {
        // Round was dropped (voice mode closed) - don't save the partial reply.
        setLiveReply("");
        setLoading(false);
        refresh();
        return;
      }
      // Speak whatever is left in the buffer after the stream ends.
      const rest = sanitizeStoredReply(streamFullRef.current.trim());
      streamFullRef.current = "";
      if (rest.length > 1) speakSegmentsRef.current.push(rest);
      pumpSpeech();
    } else {
      try {
        setLiveReply("");
        let acc = "";
        response = await chatStream(
          llmQuery,
          updatedMessages,
          fastMode ? "verse-4" : selectedModel,
          {
            ...sendOpts,
            onToken: (delta) => {
              acc += delta;
              setLiveReply(acc);
            },
          }
        );
      } catch {
        setLiveReply("");
        setLoading(false);
        const aiMsg: AIMessage = {
          id: generateId(),
          role: "assistant",
          content: "I could not reach my models just now - try again in a moment.",
          timestamp: new Date().toISOString(),
          model: selectedModel,
        };
        storage.addMessage(currentConvId, aiMsg);
        setMessages((prev) => [...prev, aiMsg]);
        refresh();
        return;
      }
    }

    const aiMsg: AIMessage = {
      id: generateId(),
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
      model: isVoiceRound ? "verse-4" : selectedModel,
      actions: opts?.actions || undefined,
      sources: sources.length ? sources : undefined,
    };

    storage.addMessage(currentConvId, aiMsg);

    const conv = storage.getData().aiConversations.find((c) => c.id === currentConvId);
    if (conv && conv.title === "New Chat" && conv.messages.length <= 2) {
      conv.title = summarizeChatTitle(queryText);
      storage.saveData();
    }

    setMessages((prev) => [...prev, aiMsg]);
    setLiveReply("");
    setLoading(false);
    refresh();
  };

  const conversations = data.aiConversations;

  // Time-based greeting + a rotating unique line, for the fresh-chat hero.
  const GREETING_SUBTITLES = [
    "What's on your mind?",
    "Let's get something done.",
    "Your workspace is ready.",
    "Ask me anything.",
    "Time to focus.",
    "How can I help?",
    "Ready when you are.",
    "Let's make today count.",
  ];
  const greeting = (() => {
    const h = new Date().getHours();
    const base =
      h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const day = Math.floor(Date.now() / 86400000);
    const sub = GREETING_SUBTITLES[day % GREETING_SUBTITLES.length];
    return { base, sub };
  })();

  // Turn a raw first message into a short, human conversation title.
  const summarizeChatTitle = (raw: string): string => {
    let t = raw.trim().replace(/\s+/g, " ");
    t = t
      .replace(
        /^(?:hey|hi|hello|yo|ok|okay|please|can you|could you|would you|will you|do you think you can|i want you to|make me|create|add|write|set up|remind me to|tell me|help me)\s+/i,
        ""
      )
      .replace(/^(?:a|an|the)\s+/i, "")
      .replace(/[?.!]+$/, "");
    if (t.length > 42) t = t.slice(0, 42).trim() + "\u2026";
    return t || raw.trim().slice(0, 42);
  };

  const startRename = (convId: string, currentTitle: string) => {
    setRenamingId(convId);
    setRenameValue(currentTitle);
    setTimeout(() => renameInputRef.current?.focus(), 30);
  };
  const commitRename = () => {
    const v = renameValue.trim();
    if (renamingId && v) {
      storage.updateConversation(renamingId, { title: v.slice(0, 60) });
      refresh();
    }
    setRenamingId(null);
  };
  const cancelRename = () => setRenamingId(null);

  const isEmptyChat =
    messages.length === 0 &&
    !loading &&
    !voiceListening &&
    !speaking &&
    !voiceProcessing &&
    !generatingImage &&
    !searching;

  const loadingText = generatingImage
    ? t("assistant.generatingImage")
    : searching
    ? t("assistant.searchingWeb")
    : selectedModel === "ethos-4.7"
    ? t("assistant.thinkingDeeply")
    : selectedModel === "verse-4"
    ? t("assistant.processing")
    : t("assistant.responding");

  // Last exchange for the immersive orb overlay (live text while streaming)
  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const lastNoorText = liveReply || [...messages].reverse().find((m) => m.role === "assistant")?.content || "";

  // Conversations panel content (shared between desktop side panel and mobile drawer)
  const chatsPanel = (onClose?: () => void) => {
    const q = chatSearch.trim().toLowerCase();
    const filtered = q
      ? conversations.filter(
          (conv) =>
            conv.title.toLowerCase().includes(q) ||
            conv.messages.some((m) => m.content.toLowerCase().includes(q))
        )
      : conversations;
    const sorted = [...filtered].sort(
      (a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-semibold text-sm tracking-tight">{t("assistant.chats")}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={exportChat}
              disabled={messages.length === 0}
              className="btn-ghost p-1.5 rounded-xl hover:bg-secondary transition-colors disabled:opacity-30"
              title={t("assistant.exportChat")}
            >
              <Download className="h-4 w-4" />
            </button>
            <button onClick={startNewChat} className="btn-ghost p-1.5 rounded-xl hover:bg-secondary transition-colors" title={t("assistant.newChat")}>
              <Plus className="h-4 w-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="btn-ghost p-1.5 rounded-xl hover:bg-secondary transition-colors" title={t("assistant.hideChats")}>
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <input
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            placeholder={t("assistant.searchChats")}
            className="w-full rounded-xl border border-border bg-secondary/40 pl-9 pr-3 py-2 text-xs outline-none transition-colors focus:border-primary-500/40"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
          {sorted.map((conv) => (
            <button
              key={conv.id}
              onClick={() => { loadConversation(conv.id); setShowChats(false); }}
              className={cn(
                "w-full text-left rounded-xl px-3 py-2.5 text-sm transition-all duration-200 group",
                conversationId === conv.id
                  ? "bg-primary-500/10 text-primary-500"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                {conv.pinned ? (
                  <Pin className="h-3.5 w-3.5 shrink-0 text-primary-500 fill-primary-500/30" />
                ) : (
                  <MessageSquare className="h-4 w-4 shrink-0" />
                )}
                {renamingId === conv.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.stopPropagation(); commitRename(); }
                      else if (e.key === "Escape") { e.stopPropagation(); cancelRename(); }
                    }}
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full min-w-0 rounded-md border border-primary-500/40 bg-background px-1.5 py-0.5 text-xs outline-none"
                  />
                ) : (
                  <span className="truncate text-xs">{conv.title}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); startRename(conv.id, conv.title); }}
                  className="touch-reveal shrink-0 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary-500"
                  title={t("assistant.rename")}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePin(conv.id); }}
                  className={cn(
                    "touch-reveal shrink-0 p-0.5 transition-opacity hover:text-primary-500",
                    conv.pinned ? "opacity-100 text-primary-500" : "opacity-0 group-hover:opacity-100"
                  )}
                  title={conv.pinned ? t("assistant.unpin") : t("assistant.pin")}
                >
                  <Pin className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="touch-reveal shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {conv.pinned && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-500/15 text-primary-500">
                    {t("assistant.pinned")}
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground/60">{conv.messages.length} {conv.messages.length !== 1 ? t("assistant.msgs") : t("assistant.msg")}</p>
                {conv.messages.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/60">
                    {msgLabel(conv.messages[conv.messages.length - 1].model)}
                  </span>
                )}
              </div>
            </button>
          ))}
          {sorted.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              {conversations.length === 0 ? t("assistant.noConversations") : t("assistant.noMatches")}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-6 h-dvh overflow-hidden relative">
      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-border/60 px-3 pt-[calc(0.625rem+env(safe-area-inset-top))] pb-2.5 sm:px-6 sm:pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pb-3">
          <div className="flex items-center min-w-0 gap-1">
            {/* Mobile drawer trigger (the app's top bar is hidden here). */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("lexis:open-drawer"))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground active:scale-95 transition-transform md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img
              src="/noor-word-white.png"
              alt="Noor"
              className="h-8 w-auto object-contain invert dark:invert-0 sm:h-9"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Model picker */}
            <div className="relative" ref={modelPickerRef}>
              <button
                onClick={() => setShowModelPicker(!showModelPicker)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border sm:px-3.5 sm:py-2.5",
                  "hover:bg-secondary",
                  showModelPicker ? "bg-secondary border-border" : "border-transparent"
                )}
              >
                <span className="hidden sm:inline">{MODEL_META[selectedModel]}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", showModelPicker && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showModelPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-72 max-w-[calc(100vw-3rem)] sm:w-80 bg-background border border-border rounded-2xl shadow-2xl p-2 z-50"
                  >
                    <p className="text-[9px] font-mono tracking-wider text-muted-foreground/40 px-3 py-1.5 uppercase">{t("assistant.models")}</p>
                    {AI_MODELS.map((m) => {
                      const isActive = selectedModel === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => changeModel(m.id)}
                          className={cn(
                            "w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200",
                            isActive ? "bg-primary-500/10 ring-1 ring-primary-500/20" : "hover:bg-secondary"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{m.name}</span>
                              {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-500/20 text-primary-500">{t("assistant.active")}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Chats toggle */}
            <button
              onClick={() => setShowChats(!showChats)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 sm:h-10 sm:w-10",
                showChats
                  ? "bg-primary-500/10 border-primary-500/30 text-primary-500"
                  : "border-transparent hover:bg-secondary text-muted-foreground"
              )}
              title={showChats ? t("assistant.hideChats") : t("assistant.showChats")}
              aria-label={showChats ? t("assistant.hideChats") : t("assistant.showChats")}
              aria-expanded={showChats}
            >
              <PanelRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesBoxRef} className={cn("flex-1 overflow-y-auto px-2 md:px-6", isEmptyChat && "hidden")}>
          <div className="noor-chat-font mx-auto max-w-4xl py-6 space-y-6 md:py-8">
            {messages.map((msg) => {
              if (msg.role === "user") {
                const isEditing = editingId === msg.id;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="group flex flex-col items-end">
                    <div className="max-w-[85%] rounded-[28px] rounded-br-lg bg-primary-500/15 border border-primary-500/20 px-5 py-3 text-[15px] text-foreground">
                      {isEditing ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void saveEdit(msg.id);
                            }
                            if (e.key === "Escape") { setEditingId(null); setEditText(""); }
                          }}
                          autoFocus
                          rows={3}
                          className="w-full min-w-[260px] max-w-[420px] resize-none bg-transparent outline-none leading-relaxed"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((a) =>
                            a.kind === "image" ? (
                              <img
                                key={a.name + (a.dataUrl || "").slice(0, 24)}
                                src={a.dataUrl || ""}
                                alt={a.name}
                                className="h-16 w-16 rounded-xl border border-primary-500/30 object-cover"
                              />
                            ) : (
                              <span
                                key={a.name}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary-500/30 bg-secondary/40 px-2 py-1 text-[11px] text-foreground/80"
                              >
                                <FileText className="h-3 w-3" />
                                {a.name}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => void saveEdit(msg.id)}
                          disabled={loading || !editText.trim()}
                          className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-background transition-all hover:opacity-90 disabled:opacity-40"
                        >
                          <Check className="h-3 w-3" /> Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditText(""); }}
                          className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(msg.id); setEditText(msg.content); }}
                        disabled={loading}
                        title={t("assistant.editMessage")}
                        className="touch-reveal mt-1.5 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/40 opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100 disabled:opacity-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </motion.div>
                );
              }
              const msgModel = resolveModelId(msg.model || "logos-4.5");
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="group flex justify-start">
                  <div className="max-w-[85%] rounded-[28px] rounded-tl-lg bg-secondary/60 border border-border/60 px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[11px] font-semibold text-foreground/60">Noor</span>
                      <span className="text-[10px] text-muted-foreground/40">· {MODEL_META[msgModel]}</span>
                    </div>
                    <div className="text-[15px] leading-relaxed text-foreground/90">
                      <Markdown content={msg.content} />
                      {msg.image && (
                        <div className="mt-2">
                          <img
                            src={typeof msg.image === "string" ? msg.image : msg.image.dataUrl}
                            alt={typeof msg.image === "string" ? "" : msg.image.prompt}
                            className="max-h-96 w-auto max-w-full rounded-2xl border border-border object-contain"
                          />
                          <p className="mt-1.5 text-[11px] text-muted-foreground/60">{typeof msg.image === "string" ? "" : msg.image.prompt}</p>
                        </div>
                      )}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {msg.sources.slice(0, 6).map((s, i) => (
                          <a
                            key={s.kind + s.id + i}
                            href={s.href}
                            target={s.kind === "web" ? "_blank" : undefined}
                            rel={s.kind === "web" ? "noreferrer" : undefined}
                            title={s.snippet || s.title}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary-500/40 hover:text-foreground"
                          >
                            {sourceIcon(s.kind)}
                            <span className="max-w-[140px] truncate">{s.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.actions.map((a) => {
                          const dk = `${a.type}:${a.id}`;
                          const done = actionDone(a);
                          return (
                            <button
                              key={dk}
                              onClick={() => handleBriefAction(a)}
                              disabled={done}
                              title={a.detail}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 disabled:cursor-default",
                                done
                                  ? "border-green-500/40 bg-green-500/10 text-green-500"
                                  : "border-primary-500/40 bg-primary-500/10 text-primary-500 hover:bg-primary-500/20"
                              )}
                            >
                              {done ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {t("assistant.actionDone")}
                                </>
                              ) : (
                                a.label
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center gap-1">
                      <p className="text-[10px] text-muted-foreground/40">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {msg.branch && (
                        <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-primary-500/15 text-primary-500">
                          {t("assistant.branching")}
                        </span>
                      )}
                      <span className="flex-1" />
                      <button
                        onClick={() => void copyMessage(msg.id, msg.content)}
                        title={copiedId === msg.id ? t("assistant.copied") : t("assistant.copy")}
                        className="touch-reveal flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/40 opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                      >
                        {copiedId === msg.id ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <CopyIcon className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={() => void regenerate(msg.id)}
                        disabled={loading || branchingId === msg.id}
                        title={t("assistant.regenerate")}
                        className="touch-reveal flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/40 opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100 disabled:opacity-30"
                      >
                        {branchingId === msg.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {loading && liveReply && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="group flex justify-start"
              >
                <div className="max-w-[85%] rounded-[28px] rounded-tl-lg bg-secondary/60 border border-border/60 px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[11px] font-semibold text-foreground/60">Noor</span>
                    <span className="text-[10px] text-muted-foreground/40">· {loadingText}</span>
                  </div>
                  <div className="text-[15px] leading-relaxed text-foreground/90">
                    <Markdown content={liveReply} />
                    <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse rounded-full bg-primary-500/70 align-middle" />
                  </div>
                </div>
              </motion.div>
            )}

            {loading && !liveReply && (
              <div className="flex items-center gap-3 pl-1">
                <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/50 px-3.5 py-2.5" aria-hidden="true">
                  <span className="lx-typing-dot text-primary-500" style={{ animationDelay: "0ms" }} />
                  <span className="lx-typing-dot text-primary-500/70" style={{ animationDelay: "160ms" }} />
                  <span className="lx-typing-dot text-primary-500/40" style={{ animationDelay: "320ms" }} />
                </div>
                <span className="text-sm text-muted-foreground/80">{loadingText}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className={cn(
            "shrink-0 px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-[calc(1rem+env(safe-area-inset-bottom))]",
            isEmptyChat
              ? "flex-1 flex flex-col justify-end border-t border-border/60 bg-background/80 backdrop-blur-sm pt-3 sm:pt-4 lg:items-center lg:justify-center lg:border-t-0 lg:bg-transparent lg:backdrop-blur-none lg:pt-0"
              : "border-t border-border/60 bg-background/80 backdrop-blur-sm pt-3 sm:pt-4"
          )}
        >
          <div className={cn("w-full", isEmptyChat ? "mx-auto max-w-2xl" : "mx-auto max-w-4xl")}>
            {isEmptyChat && (
              <div className="hidden lg:flex mb-6 flex-col items-center text-center">
                <h1 className="font-semibold text-3xl tracking-tight text-foreground sm:text-4xl">{greeting.base}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{greeting.sub}</p>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 py-1 pl-1 pr-2 text-xs">
                    {a.kind === "image" ? (
                      <img src={a.dataUrl || ""} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="max-w-[140px] truncate text-muted-foreground">{a.name}</span>
                    <button
                      onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id!))}
                      className="text-muted-foreground/50 transition-colors hover:text-foreground"
                      aria-label={"Remove " + a.name}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!isEmptyChat && !input.trim() && !loading && !voiceListening && !speaking && !voiceProcessing && (
              <div className="mb-2 flex justify-start">
                <button
                  onClick={requestDailyBrief}
                  title={t("assistant.dailyBriefHint")}
                  aria-label={t("assistant.dailyBrief")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-primary-500/40 hover:text-foreground hover:bg-secondary active:scale-95"
                >
                  <MessageSquare className="h-3 w-3 text-primary-500" />
                  {t("assistant.dailyBrief")}
                </button>
              </div>
            )}
            <div className={cn("flex items-center gap-2 border border-border bg-secondary/40 pl-4 pr-2 py-2 transition-all focus-within:border-primary-500/40 focus-within:ring-2 focus-within:ring-primary-500/10", composerMultiline ? "rounded-[20px]" : "rounded-full")}>
              {voiceListening || voiceProcessing || speaking ? (
                <div className="flex w-full items-center gap-3 py-0.5 pl-1 pr-1">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                    {voiceListening ? (
                      <VoiceOrb state="listening" size="sm" />
                    ) : speaking ? (
                      <VoiceOrb state="speaking" size="sm" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-muted-foreground">
                      {voiceListening ? t("assistant.listening") : speaking ? t("assistant.speaking") : t("assistant.transcribingLong")}
                    </p>
                  </div>
                  {voiceListening && (
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {formatDuration(voiceDuration)}
                    </span>
                  )}
                  {(voiceListening || speaking) && (
                    <button
                      onClick={voiceListening ? stopVoice : () => { stopSpeaking(); setSpeaking(false); }}
                      aria-label={voiceListening ? t("assistant.stop") : t("assistant.endVoice")}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-150 active:scale-90",
                        voiceListening ? "bg-red-500 text-white" : "bg-foreground text-background"
                      )}
                    >
                      <Square className="h-3.5 w-3.5 fill-current" />
                    </button>
                  )}
                </div>
              ) : (
                <>
              <div className="relative shrink-0" ref={plusRef}>
                <button
                  onClick={() => setPlusOpen(!plusOpen)}
                  aria-label={t("assistant.attach")}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-secondary hover:text-foreground active:scale-95",
                    plusOpen && "bg-secondary text-foreground"
                  )}
                >
                  <Plus className="h-5 w-5" />
                </button>
                {plusOpen && (
                  <div className="absolute bottom-full left-0 z-30 mb-2 w-60 rounded-2xl border border-border bg-background/95 p-1.5 shadow-xl backdrop-blur-md">
                    <button
                      onClick={() => { imageInputRef.current?.click(); setPlusOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-secondary"
                    >
                      <ImagePlus className="h-4 w-4 text-primary-500" />
                      {t("assistant.attachImage")}
                    </button>
                    <button
                      onClick={() => { fileInputRef.current?.click(); setPlusOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-secondary"
                    >
                      <Paperclip className="h-4 w-4 text-primary-500" />
                      {t("assistant.attachFile")}
                    </button>
                    <div className="my-1 h-px bg-border/70" />
                    <button
                      onClick={() => setWebMode(!webMode)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-secondary"
                    >
                      <Globe className={cn("h-4 w-4", webMode ? "text-sky-500" : "text-muted-foreground")} />
                      <span className="flex-1">{t("assistant.web")}</span>
                      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", webMode ? "bg-sky-500" : "border border-border bg-secondary")}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", webMode ? "left-[18px]" : "left-0.5")} />
                      </span>
                    </button>
                    <button
                      onClick={() => setFastMode(!fastMode)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-secondary"
                    >
                      <Zap className={cn("h-4 w-4", fastMode ? "text-primary-500" : "text-muted-foreground")} />
                      <span className="flex-1">{t("assistant.fastMode")}</span>
                      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", fastMode ? "bg-primary-500" : "border border-border bg-secondary")}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", fastMode ? "left-[18px]" : "left-0.5")} />
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAttachImage} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttachFile} />
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={selectedModel === "verse-4" ? t("assistant.quickQuestion") : t("assistant.messageNoor")}
                className="noor-chat-font flex-1 bg-transparent resize-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px] py-2 max-h-40 leading-relaxed"
                rows={1}
              />
              <button
                onClick={() => startVoice()}
                disabled={!voiceSupported || loading || voiceActive}
                title={voiceSupported ? t("assistant.tapToSpeak") : t("assistant.voiceUnsupported")}
                aria-label={t("assistant.tapToSpeak")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary/40 text-muted-foreground transition-all duration-200 hover:border-primary-500/40 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <Mic className="h-5 w-5" />
              </button>
              {!input.trim() && (
                <button
                  onClick={toggleVoiceMode}
                  disabled={!voiceSupported || loading}
                  title={voiceSupported ? (voiceActive ? t("assistant.endVoice") : t("assistant.tapToTalk")) : t("assistant.voiceUnsupported")}
                  aria-label={t("assistant.tapToTalk")}
                  className={cn(
                    "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                    voiceActive
                      ? "border-primary-500/40 bg-primary-500/10"
                      : "border-border/60 bg-secondary/40 hover:border-primary-500/40"
                  )}
                >
                  <VoiceOrb state={speaking ? "speaking" : "idle"} size="sm" />
                  {voiceActive && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-70" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-500" />
                    </span>
                  )}
                </button>
              )}
              {/* Send button: only when something is typed (replaces the orb). */}
              {!!input.trim() && (
                <button
                  onClick={() => sendMessage()}
                  disabled={loading}
                  className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  <Send className="h-5 w-5" />
                </button>
              )}
                </>
              )}
            </div>
            <p className="hidden sm:block text-[10px] text-muted-foreground/40 text-center mt-2">
              {voiceError === "permission"
                ? t("assistant.permissionDenied")
                : voiceError === "generic"
                ? t("assistant.voiceError")
                : voiceActive && !voiceListening && !voiceProcessing && !speaking
                ? (
                    <span className="inline-flex items-center gap-1.5 text-primary-500/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
                      {t("assistant.voiceMode")} - {t("assistant.tapAgain")}
                    </span>
                  )
                : t("assistant.disclaimer")}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop chats panel (right side) - CSS transition so it glides on
          every device (framer-motion is globally disabled on touch UIs to
          kill the tab-switch flicker, which made this snap). */}
      <aside
        aria-hidden={!showChats}
        className={cn(
          "hidden lg:flex flex-col shrink-0 overflow-hidden border-l border-border/60 transition-[width,opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          showChats ? "w-72 opacity-100" : "w-0 opacity-0 translate-x-8 border-transparent"
        )}
      >
        <div className="w-72 shrink-0 h-full pl-6">
          {chatsPanel(() => setShowChats(false))}
        </div>
      </aside>

      {/* Mobile chats drawer - CSS transition so it glides on touch devices */}
      <div
        aria-hidden={!showChats}
        onClick={() => setShowChats(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          showChats ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      <div
        aria-hidden={!showChats}
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-sidebar border-l border-border p-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          showChats ? "translate-x-0" : "translate-x-full pointer-events-none"
        )}
      >
        <div className="flex items-center justify-end mb-2">
          <button onClick={() => setShowChats(false)} className="btn-ghost p-1.5 rounded-xl hover:bg-secondary transition-colors" title={t("assistant.closeChats")}>
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        {chatsPanel()}
      </div>

      <VoiceModeOverlay
        open={voiceModeOpen}
        listening={voiceListening}
        processing={voiceProcessing}
        thinking={loading}
        speaking={speaking}
        userText={lastUserText}
        noorText={lastNoorText}
        error={voiceError}
        missed={missed}
        onTap={handleOrbTap}
        onClose={closeVoiceMode}
      />
    </div>
  );
}
