import { NextResponse } from "next/server";
import { guardApi } from "@/lib/apiGuard";
import { callChat } from "@/lib/ai-provider";

export const runtime = "nodejs";
export const maxDuration = 60;

// ============================================================
// File overview engine - lets Noor "read" big files.
//
// Strategy: map-reduce. The text is split into ~9k-char chunks,
// each chunk is summarized in parallel by the fast 8B model, and
// the chunk summaries are synthesized into one structured overview
// by the 70B model. A 500KB file becomes ~30-60 compact chunks of
// bullets instead of a wall of raw text - small enough to fit in
// any model's context window, so Noor actually understands the
// whole file and can answer questions / write overviews about it.
// ============================================================

const CHUNK_MODEL = "meta/llama-3.1-8b-instruct"; // fast per-chunk extraction
const SYNTH_MODEL = "meta/llama-3.1-70b-instruct"; // final overview quality

const CHUNK_CHARS = 9000;
const CHUNK_OVERLAP = 500;
const MAX_TEXT = 500_000; // chars (matches the client's read cap)
const MAX_CHUNKS = 40;
const MAX_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 45000;

async function callModel(
  messages: { role: string; content: string }[],
  maxTokens: number
): Promise<string | null> {
  try {
    const call = await callChat({
      model: CHUNK_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
      timeoutMs: REQUEST_TIMEOUT_MS,
    });
    if (!call.ok || !call.response) return null;
    const data = await call.response.json();
    const content: string = data?.choices?.[0]?.message?.content || "";
    return content.trim() || null;
  } catch {
    return null;
  }
}

/** Split text into ~CHUNK_CHARS pieces on paragraph/sentence boundaries. */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > 0) {
    if (rest.length <= CHUNK_CHARS) {
      chunks.push(rest);
      break;
    }
    // Prefer cutting at a paragraph break, then a sentence, then hard-cut.
    const window = rest.slice(0, CHUNK_CHARS);
    let cut = -1;
    const para = window.lastIndexOf("\n\n");
    const sentence = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf("\n")
    );
    if (para > CHUNK_CHARS * 0.5) cut = para;
    else if (sentence > CHUNK_CHARS * 0.5) cut = sentence + 1;
    else cut = CHUNK_CHARS;

    chunks.push(rest.slice(0, cut));
    // Carry a little overlap so the next chunk keeps sentence context.
    rest = rest.slice(Math.max(cut - CHUNK_OVERLAP, 0));
  }
  return chunks.slice(0, MAX_CHUNKS);
}

const CHUNK_PROMPT = `You are the extraction engine of Orleia, a productivity app. You are given one excerpt of a larger document. Extract its key information into concise bullet points. Capture: main topics, important facts, names/people/places, numbers, decisions, deadlines, and action items. Be factual and complete - include only what the excerpt actually says, never add outside knowledge or commentary. Keep the whole answer under 200 words. No preamble, no headers, just bullets.`;

const SYNTH_PROMPT = `You are Noor, the warm AI companion inside Orleia. A user attached a document and below are numbered summaries of its sections (each from a different part of the file). Write ONE clear, well-structured overview of the whole document so the user immediately understands what it is and what matters in it.

Structure:
## What this is
One or two sentences.
## Key points
5-10 bullets of the most important facts, topics, and decisions.
## Details worth knowing
A few bullets: names, numbers, dates, deadlines, anything specific.
## Action items / next steps
Bullets of anything the user may need to do, if the document implies any. If none, say "None implied."

Rules: base EVERYTHING strictly on the section summaries below - never invent facts, numbers, or names. Keep the whole overview under 350 words. Markdown is fine.`;

export async function POST(req: Request) {
  const denied = guardApi(req, { perMinute: 120, perDay: 5000 });
  if (denied) return denied;

  let body: { text?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body?.text === "string" ? body.text : "";
  const title = typeof body?.title === "string" ? body.title.slice(0, 200) : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > MAX_TEXT) {
    return NextResponse.json({ error: "text too large" }, { status: 400 });
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "no content" }, { status: 400 });
  }

  // ---- single chunk: one direct call, best quality ----
  if (chunks.length === 1) {
    const overview = await callModel(
      [
        {
          role: "system",
          content: SYNTH_PROMPT,
        },
        {
          role: "user",
          content: `Document: ${title || "untitled"}\n\nContent:\n${chunks[0]}`,
        },
      ],
      700
    );
    if (!overview) {
      return NextResponse.json({ error: "overview failed" }, { status: 502 });
    }
    return NextResponse.json({ overview, chunks: 1 });
  }

  // ---- multi-chunk: summarize each chunk (parallel, bounded), then synthesize ----
  const summarizeChunk = async (chunk: string, i: number): Promise<string | null> => {
    const raw = await callModel(
      [
        { role: "system", content: CHUNK_PROMPT },
        { role: "user", content: `Excerpt ${i + 1} of ${chunks.length}:\n\n${chunk}` },
      ],
      300
    );
    if (raw) return raw;
    // Fallback: a truncated raw excerpt keeps the synthesis from losing this section.
    return chunk.slice(0, 1500) + " ...(raw excerpt fallback)";
  };

  const summaries: (string | null)[] = new Array(chunks.length).fill(null);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, chunks.length) }, async () => {
    while (cursor < chunks.length) {
      const i = cursor++;
      summaries[i] = await summarizeChunk(chunks[i]!, i);
    }
  });
  await Promise.all(workers);

  const valid = summaries.filter((s): s is string => !!s && s.trim().length > 0);
  if (valid.length === 0) {
    return NextResponse.json({ error: "overview failed" }, { status: 502 });
  }
  if (valid.length < Math.ceil(chunks.length / 2)) {
    return NextResponse.json({ error: "overview failed - too many sections failed" }, { status: 502 });
  }

  // Keep original section numbering even when a chunk fell back to raw text.
  const block = summaries
    .map((s, i) => (s && s.trim() ? `--- Section ${i + 1} ---\n${s.trim()}` : null))
    .filter((x): x is string => !!x)
    .join("\n\n");

  const overview = await callModel(
    [
      { role: "system", content: SYNTH_PROMPT },
      { role: "user", content: `Document title: ${title || "untitled"}\n\n${block}` },
    ],
      900
  );

  if (!overview) {
    return NextResponse.json({ error: "overview failed" }, { status: 502 });
  }
  return NextResponse.json({ overview, chunks: chunks.length });
}
