import { NextResponse } from "next/server";
import Stripe from "stripe";
import { guardApi } from "@/lib/apiGuard";
import { billingConfigured } from "@/lib/plans";
import { getLicense, setLicense } from "@/lib/billing-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/cancel  { deviceId }
 *
 * One-click in-app cancellation (consumer-law requirement for "cancel
 * anytime"): sets cancel_at_period_end on the Stripe subscription. Benefits
 * (tier + daily cap) continue until the end of the period already paid for;
 * the webhook drops the license when Stripe ends the subscription.
 * Never touches payouts or payment methods — the user keeps self-service
 * control in the Stripe portal for anything beyond canceling.
 */
export async function POST(req: Request) {
  const denied = guardApi(req, { perMinute: 6, perDay: 40 });
  if (denied) return denied;

  if (!billingConfigured()) {
    return NextResponse.json({ error: "Billing is launching soon." }, { status: 503 });
  }

  let body: { deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const deviceId = String(body.deviceId || "").slice(0, 64);
  if (!deviceId) return NextResponse.json({ error: "missing deviceId" }, { status: 400 });

  const license = await getLicense(deviceId);
  if (license.tier === "free" || !license.subscriptionId) {
    return NextResponse.json({ error: "No active subscription found." }, { status: 404 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const sub = await stripe.subscriptions.update(license.subscriptionId, {
      cancel_at_period_end: true,
    });
    const periodEnd =
      typeof (sub as unknown as { current_period_end?: number }).current_period_end === "number"
        ? new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
        : license.periodEnd;

    await setLicense(deviceId, { ...license, cancelAtPeriodEnd: true, periodEnd, updatedAt: new Date().toISOString() });

    return NextResponse.json({ ok: true, periodEnd });
  } catch (e) {
    console.error("cancel failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not cancel the subscription. Try the billing portal or contact support." }, { status: 502 });
  }
}
