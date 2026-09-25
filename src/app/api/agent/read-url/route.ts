import { NextResponse } from "next/server";
import { guardApi } from "@/lib/apiGuard";

export const runtime = "nodejs";
export const maxDuration = 30;

// Agent's "read this page" tool: fetch a URL server-side and extract the
// readable text so Agent can reason over pages outside Orleia. Guarded like
// every other endpoint (rate limit, size cap) and SSRF-hardened: only
// http(s), private/loopback hosts and non-web ports refused, response size
// capped, never evaluated - text only.

const BLOCKED_HOSTS = /^(localhost$|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  const denied = guardApi(req, { perMinute: 20, perDay: 500 });
  if (denied) return denied;
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 8 * 1024) return NextResponse.json({ error: "payload too large" }, { status: 413 });

  let url = "";
  try {
    const body = (await req.json()) as { url?: string };
    url = String(body.url || "");
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "unsupported protocol" }, { status: 400 });
  }
  if (BLOCKED_HOSTS.test(parsed.hostname) || (parsed.port && !["80", "443"].includes(parsed.port))) {
    return NextResponse.json({ error: "host not allowed" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrleiaAgent/2.5; +https://orleia.app)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `fetch failed (${res.status})` }, { status: 502 });
    }
    const ctype = res.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml|application\/json|text\/xml|application\/xml/.test(ctype)) {
      return NextResponse.json({ error: "unsupported content type" }, { status: 415 });
    }
    const raw = await res.text();
    const isHtml = /text\/html|application\/xhtml/.test(ctype);
    const text = isHtml ? extractText(raw) : raw.replace(/\s+/g, " ").trim();
    const titleM = isHtml ? raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i) : null;
    return NextResponse.json({
      url: parsed.toString(),
      title: titleM ? extractText(titleM[1]).slice(0, 200) : "",
      text: text.slice(0, 12_000),
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
