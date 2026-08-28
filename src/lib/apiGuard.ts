import { NextResponse } from "next/server";

// ============================================================
// API Guard - protects the NVIDIA-backed endpoints from abuse.
//
// The app is a browser-only client, so every legitimate request
// carries an Origin/Referer header matching the deployed domains.
// Scripts, curl, and scrapers don't - they get rejected, which
// stops strangers from burning the user's paid AI quota.
//
// Rate limits are in-memory per serverless instance (best-effort);
// the Origin check is the primary defense, these are the backstop.
// ============================================================

const ALLOWED_HOSTS = [
  "lexisapp.xyz",
  "www.lexisapp.xyz",
  "app.lexisapp.xyz",
  "lexis-workspace.vercel.app",
  "lexis-suite.vercel.app",
  "lexis-landing-six.vercel.app",
  "lexis-landing.vercel.app",
  "localhost:3000",
  "localhost:3999",
  "localhost:3001",
  "127.0.0.1:3000",
  "127.0.0.1:3999",
];

function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (ALLOWED_HOSTS.includes(h)) return true;
  // Vercel preview deployments: lexis-<project>-<hash>-<user>.vercel.app
  if (/^lexis-[a-z0-9-]+\.vercel\.app$/.test(h)) return true;
  return false;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function isAllowedRequest(req: Request): boolean {
  const originHost = hostOf(req.headers.get("origin"));
  if (originHost) return isAllowedHost(originHost);
  const refererHost = hostOf(req.headers.get("referer"));
  if (refererHost) return isAllowedHost(refererHost);
  // No Origin AND no Referer: a non-browser client (script/curl/scraper).
  return false;
}

// Per-IP sliding window (last 60s) and calendar-day cap.
const minuteBuckets = new Map<string, number[]>();
const dayBuckets = new Map<string, { day: number; count: number }>();

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitHit(ip: string, perMinute: number, perDay: number): boolean {
  const now = Date.now();

  const min = (minuteBuckets.get(ip) || []).filter((t) => now - t < 60_000);
  if (min.length >= perMinute) {
    minuteBuckets.set(ip, min);
    return true;
  }
  min.push(now);
  minuteBuckets.set(ip, min);

  const dayKey = Math.floor(now / 86_400_000);
  const prev = dayBuckets.get(ip) || { day: dayKey, count: 0 };
  if (prev.day === dayKey && prev.count >= perDay) return true;
  dayBuckets.set(ip, { day: dayKey, count: prev.day === dayKey ? prev.count + 1 : 1 });
  return false;
}

/** Returns null when the request is allowed, or an error response to return. */
export function guardApi(
  req: Request,
  opts: { perMinute?: number; perDay?: number; unlimited?: boolean } = {}
): NextResponse | null {
  if (!isAllowedRequest(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // The NVIDIA key is free + unlimited, so the per-minute/day caps were a
  // self-inflicted throttle (they 429'd mid-reply and kicked Noor onto the
  // robotic device voice). The Origin check above is the real anti-abuse
  // defense; the AI routes pass unlimited:true to skip rate limits entirely.
  if (opts.unlimited) return null;
  const ip = getClientIp(req);
  if (rateLimitHit(ip, opts.perMinute ?? 30, opts.perDay ?? 400)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}

// ---- input cap helpers -------------------------------------------------

export function capInt(v: unknown, max: number, def: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : def;
  return Math.min(Math.max(1, n), max);
}

export function capFloat(v: unknown, min: number, max: number, def: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : def;
  return Math.min(Math.max(min, n), max);
}
