// ============================================================
// Orleia billing store — Supabase-first, Blob fallback.
//
// Primary backend: Supabase Postgres.
//   - noor_usage(device_id, day, n) — daily Noor counter, incremented
//     atomically via the incr_noor_usage SQL function (race-free).
//   - billing_license(device_id, ...) — Stripe-driven license rows.
//   - RLS enabled + all grants revoked: only the service key (server-side)
//     can touch these tables. deviceId is a random UUID in localStorage —
//     no accounts, no personal data, nothing to leak.
//
// Fallback backend: Vercel Blob (previous layout, kept verbatim):
//   billing/license/<deviceId>.json, billing/usage/<deviceId>/<date>.json
//
// Every Supabase failure (project paused, network, outage) automatically
// falls back to Blob; every Blob failure surfaces to consumeNoorTurn's
// caller, which fails open. This keeps billing alive through any single
// backend outage.
// ============================================================

import { put, get, del } from "@vercel/blob";
import { billingConfigured, NOOR_DAILY_LIMIT } from "@/lib/plans";

const LICENSE_PREFIX = "billing/license/";
const USAGE_PREFIX = "billing/usage/";

// ---------------- Supabase (primary) ----------------

const SB_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function sbConfigured(): boolean {
  return Boolean(SB_URL && SB_SERVICE_KEY);
}

async function sbRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!sbConfigured()) return null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: SB_SERVICE_KEY,
        Authorization: `Bearer ${SB_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function sbSelect<T>(table: string, searchParams: string): Promise<T[] | null> {
  if (!sbConfigured()) return null;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${searchParams}`, {
      headers: {
        apikey: SB_SERVICE_KEY,
        Authorization: `Bearer ${SB_SERVICE_KEY}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

async function sbUpsert(table: string, row: Record<string, unknown>): Promise<boolean> {
  if (!sbConfigured()) return false;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SB_SERVICE_KEY,
        Authorization: `Bearer ${SB_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sbDelete(table: string, eq: string): Promise<boolean> {
  if (!sbConfigured()) return false;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?${eq}`, {
      method: "DELETE",
      headers: {
        apikey: SB_SERVICE_KEY,
        Authorization: `Bearer ${SB_SERVICE_KEY}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------- Blob (fallback) ----------------

export interface StoredLicense {
  tier: "free" | "plus" | "pro" | "ultra";
  status: "active" | "canceled" | "past_due";
  customerId?: string;
  subscriptionId?: string;
  periodEnd?: string; // ISO
  /** True once the user cancels: benefits run until periodEnd, then stop. */
  cancelAtPeriodEnd?: boolean;
  updatedAt: string;
}

function licenseKey(deviceId: string): string {
  return `${LICENSE_PREFIX}${encodeURIComponent(deviceId)}.json`;
}

async function readJson(key: string): Promise<unknown | null> {
  try {
    const res = await get(key, { access: "public" });
    if (!res) return null;
    const text = await new Response(res.stream).text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function usageKey(deviceId: string, date: string): string {
  return `${USAGE_PREFIX}${encodeURIComponent(deviceId)}/${date}.json`;
}

// ---------------- License (Supabase -> Blob) ----------------

const validTiers = new Set(["free", "plus", "pro", "ultra"]);

export async function getLicense(deviceId: string): Promise<StoredLicense> {
  // Primary: Supabase row.
  const rows = await sbSelect<StoredLicense & { device_id: string }>(
    "billing_license",
    `device_id=eq.${encodeURIComponent(deviceId)}&select=*`
  );
  if (rows && rows.length && validTiers.has(rows[0].tier)) {
    const { device_id: _d, ...lic } = rows[0];
    return lic as StoredLicense;
  }
  // Fallback: Blob JSON.
  const fallback: StoredLicense = { tier: "free", status: "active", updatedAt: new Date().toISOString() };
  const parsed = (await readJson(licenseKey(deviceId))) as StoredLicense | null;
  if (!parsed || !validTiers.has(parsed.tier)) return fallback;
  return parsed;
}

export async function setLicense(deviceId: string, license: StoredLicense): Promise<void> {
  // Primary: upsert into Supabase.
  const ok = await sbUpsert("billing_license", {
    device_id: deviceId,
    tier: license.tier,
    status: license.status,
    customer_id: license.customerId ?? null,
    subscription_id: license.subscriptionId ?? null,
    period_end: license.periodEnd ?? null,
    cancel_at_period_end: license.cancelAtPeriodEnd ?? false,
    updated_at: new Date().toISOString(),
  });
  if (ok) return;
  // Fallback: Blob JSON.
  await put(licenseKey(deviceId), JSON.stringify(license), {
    access: "public",
    addRandomSuffix: false,
    cacheControlMaxAge: 0, // bypass CDN cache: cap counter + cancels must be read fresh
    allowOverwrite: true,
  });
}

export async function deleteLicense(deviceId: string): Promise<void> {
  await sbDelete("billing_license", `device_id=eq.${encodeURIComponent(deviceId)}`);
  try {
    await del(licenseKey(deviceId));
  } catch {
    /* already gone */
  }
}

// ---------------- Usage counter (Supabase RPC -> Blob) ----------------

export async function getUsage(deviceId: string, date: string): Promise<number> {
  // Primary: Supabase row (read via select; no side effects).
  const rows = await sbSelect<{ n: number }>(
    "noor_usage",
    `device_id=eq.${encodeURIComponent(deviceId)}&day=eq.${encodeURIComponent(date)}&select=n`
  );
  if (rows && rows.length && typeof rows[0].n === "number") return rows[0].n;
  if (rows) return 0; // Supabase reachable, row absent -> genuinely 0
  // Fallback: Blob JSON.
  const parsed = (await readJson(usageKey(deviceId, date))) as { n?: number } | null;
  return parsed && typeof parsed.n === "number" && parsed.n > 0 ? Math.floor(parsed.n) : 0;
}

export async function incrUsage(deviceId: string, date: string): Promise<number> {
  // Primary: atomic SQL increment (single round-trip, race-free).
  const n = await sbRpc<number>("incr_noor_usage", { p_device: deviceId, p_day: date });
  if (typeof n === "number") return n;
  // Fallback: read-modify-write in Blob.
  const cur = await getUsage(deviceId, date);
  const next = cur + 1;
  await put(usageKey(deviceId, date), JSON.stringify({ n: next }), {
    access: "public",
    addRandomSuffix: false,
    cacheControlMaxAge: 0, // bypass CDN cache: cap counter + cancels must be read fresh
    allowOverwrite: true,
  });
  return next;
}

export interface NoorCapResult {
  ok: boolean; // false -> request must be rejected with 402
  used: number;
  limit: number; // Infinity = unlimited
  tier: string;
}

/**
 * Single source of Noor cap enforcement. Consumes one Noor turn for the
 * device and reports whether the request may proceed.
 *  - Billing unconfigured -> always allow (pre-launch state).
 *  - Missing/unknown device -> deny (prevents header-stripping bypass);
 *    genuine clients always send x-orleia-device.
 * Counts toward the daily limit at midnight reset (UTC date key).
 */
export async function consumeNoorTurn(deviceId: string): Promise<NoorCapResult> {
  if (!billingConfigured()) return { ok: true, used: 0, limit: Number.POSITIVE_INFINITY, tier: "free" };
  if (!deviceId) return { ok: false, used: 0, limit: NOOR_DAILY_LIMIT.free, tier: "free" };
  const license = await getLicense(deviceId);
  const today = new Date().toISOString().slice(0, 10);
  const limit = NOOR_DAILY_LIMIT[license.tier];
  const used = await getUsage(deviceId, today);
  if (used >= limit) return { ok: false, used, limit, tier: license.tier };
  await incrUsage(deviceId, today);
  return { ok: true, used: used + 1, limit, tier: license.tier };
}
