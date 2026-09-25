import { NextResponse } from "next/server";
import { guardApi } from "@/lib/apiGuard";
import { billingConfigured, NOOR_DAILY_LIMIT } from "@/lib/plans";
import { getLicense, getUsage } from "@/lib/billing-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/billing/license?deviceId=... -> tier + today's Noor usage. */
export async function GET(req: Request) {
  const denied = guardApi(req, { perMinute: 30, perDay: 500 });
  if (denied) return denied;

  const url = new URL(req.url);
  const deviceId = (url.searchParams.get("deviceId") || "").slice(0, 64);
  if (!deviceId) return NextResponse.json({ error: "missing deviceId" }, { status: 400 });

  const license = billingConfigured() ? await getLicense(deviceId) : { tier: "free" as const, status: "active" as const };
  const today = new Date().toISOString().slice(0, 10);
  const used = billingConfigured() ? await getUsage(deviceId, today) : 0;
  const limit = NOOR_DAILY_LIMIT[license.tier];

  return NextResponse.json({
    tier: license.tier,
    status: license.status,
    periodEnd: "periodEnd" in license ? license.periodEnd : undefined,
    cancelAtPeriodEnd: "cancelAtPeriodEnd" in license ? license.cancelAtPeriodEnd : false,
    // False for granted (comped) licenses: no Stripe subscription to manage.
    managed: "subscriptionId" in license ? Boolean(license.subscriptionId) : false,
    used,
    limit: Number.isFinite(limit) ? limit : null, // null = unlimited
    billingConfigured: billingConfigured(),
  }, { headers: { "Cache-Control": "no-store" } });
}
