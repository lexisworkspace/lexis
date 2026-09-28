// ============================================================
// Web search for Noor's "Web" toggle.
//
// Runs server-side in /api/search so the browser never scrapes
// third-party HTML. DuckDuckGo HTML first, Bing HTML as a
// fallback - both keyless, so Noor gets live answers for free.
// ============================================================

import type { AISource } from "@/types";

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const KIND_LABELS: Record<string, string> = {
  document: "Document",
  journal: "Journal",
  task: "Task",
  habit: "Habit",
  web: "Web",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();
}

async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/** The DDG html endpoint wraps real URLs behind //duckduckgo.com/l/?uddg=<encoded>. */
function realUrl(href: string): string {
  const m = href.match(/[?&]uddg=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      /* fall through */
    }
  }
  if (href.startsWith("//")) return "https:" + href;
  return href;
}

async function searchDuckDuckGo(q: string, limit: number): Promise<WebResult[]> {
  const html = await fetchHtml(
    "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q)
  );
  if (!html) return [];

  const titles: { url: string; title: string }[] = [];
  const titleRe = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(html)) && titles.length < limit) {
    const url = realUrl(m[1]);
    if (!url.startsWith("http")) continue;
    titles.push({ url, title: cleanText(m[2]) });
  }
  const snips: string[] = [];
  const snipRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  while ((m = snipRe.exec(html)) && snips.length < titles.length) {
    snips.push(cleanText(m[1]));
  }
  return titles.map((t, i) => ({ ...t, snippet: snips[i] || "" }));
}

async function searchBing(q: string, limit: number): Promise<WebResult[]> {
  const html = await fetchHtml(
    "https://www.bing.com/search?q=" + encodeURIComponent(q) + "&count=" + limit
  );
  if (!html) return [];
  const out: WebResult[] = [];
  const blockRe = /<li class="b_algo"[\s\S]*?<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) && out.length < limit) {
    const block = m[0];
    const a = block.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/);
    if (!a) continue;
    const url = a[1];
    if (!url.startsWith("http")) continue;
    const p = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    out.push({
      title: cleanText(a[2]),
      url,
      snippet: p ? cleanText(p[1]) : "",
    });
  }
  return out;
}

export async function webSearch(q: string, limit = 6): Promise<WebResult[]> {
  const n = Math.min(Math.max(2, limit), 8);
  const ddg = await searchDuckDuckGo(q, n);
  if (ddg.length >= 3) return ddg.slice(0, n);
  const bing = await searchBing(q, n);
  if (bing.length) return bing.slice(0, n);
  return ddg.slice(0, n);
}

/**
 * Render sources as a numbered block the system prompt tells the model to
 * cite with [1], [2], ... The block is appended to the system prompt.
 */
export function buildSearchBlock(sources: AISource[]): string {
  if (!sources || sources.length === 0) return "";
  const hasWeb = sources.some((s) => s.kind === "web");
  const lines = sources.map(
    (s, i) =>
      `[${i + 1}] ${KIND_LABELS[s.kind] || "Source"}: "${s.title}" - ${s.snippet || "No preview available"}`
  );
  return (
    "\n\n" +
    (hasWeb
      ? "WEB SEARCH RESULTS (live results from the web - up to date):"
      : "WORKSPACE SEARCH RESULTS (real data from the user's Orleia workspace - live facts, not guesses):") +
    "\n" +
    lines.join("\n") +
    "\n\nUse these results when they are relevant. Cite them inline like [1], [2] next to the facts you use. If none are relevant, say so briefly and answer from what you know."
  );
}
