import { NextResponse } from "next/server";
import { guardApi } from "@/lib/apiGuard";
import { webSearch } from "@/lib/web-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Server-side web search for Noor's Web toggle. Keyless (DuckDuckGo HTML
// first, Bing fallback), so Noor can cite live answers for free.
export async function POST(req: Request) {
  const blocked = guardApi(req, { unlimited: true });
  if (blocked) return blocked;

  let q = "";
  try {
    const body = await req.json();
    q = typeof body?.q === "string" ? body.q.trim().slice(0, 300) : "";
  } catch {
    /* malformed body - treat as empty query */
  }
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await webSearch(q, 6);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
