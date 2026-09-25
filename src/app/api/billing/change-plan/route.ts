import { NextResponse } from "next/server";
import Stripe from "stripe";
import { guardApi } from "@/lib/apiGuard";
import { billingConfigured, planByTier, stripePriceFor, type BillingInterval } from "@/lib/plans";
import { getLicense, setLicense } from "@/lib/billing-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/change-plan  { deviceId, tier, interval }
 *
 * In-app upgrades/downgrades between Plus/Pro/Ultra: swaps the price on the
 * existing Stripe subscription (prorated) instead of creating a second one.
 * Also re-activates a subscription that was set to cancel at period end —
 * choosing a plan is an explicit intent to stay subscribed. The license is
 * rewritten immediately for instant UI feedback; the
 * customer.subscription.updated webhook reconciles anything we missed.
 */
export async function POST(req: Request) {
  const denied = guardApi(req, { perMinute: 6, perDay: 40 });
  if (denied) return denied;

  if (!billingConfigured()) {
    return NextResponse.json({ error: "Billing is launching soon." }, { status: 503 });
  }

  let body: { deviceId?: string; tier?: string; interval?: string; grantKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const plan = planByTier(String(body.tier || ""));
  const interval: BillingInterval = body.interval === "yearly" ? "yearly" : "monthly";
  const deviceId = String(body.deviceId || "").slice(0, 64);
  if (!plan) return NextResponse.json({ error: "unknown tier" }, { status: 400 });
  if (!deviceId) return NextResponse.json({ error: "missing deviceId" }, { status: 400 });

  const license = await getLicense(deviceId);
  if (license.tier === "free") {
    return NextResponse.json({ error: "No subscription to change." }, { status: 404 });
  }

  const priceId = stripePriceFor(plan.tier, interval);
  if (!priceId) return NextResponse.json({ error: "Billing is launching soon." }, { status: 503 });

  // Granted (comped) licenses have no Stripe subscription behind them.
  // They can still switch tiers, but only with the owner grant key —
  // otherwise anyone could rewrite their own license for free.
  if (!license.subscriptionId) {
    const grantKey = process.env.ORLEIA_GRANT_KEY || "";
    const provided = typeof body.grantKey === "string" ? body.grantKey : "";
    if (!grantKey || provided.length !== grantKey.length || provided !== grantKey) {
      return NextResponse.json({ error: "granted" }, { status: 409 });
    }
    await setLicense(deviceId, {
      tier: plan.tier,
      status: "active",
      customerId: license.customerId,
      periodEnd: license.periodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, tier: plan.tier, granted: true });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const sub = await stripe.subscriptions.retrieve(license.subscriptionId);
    const item = sub.items.data[0];
    if (!item) return NextResponse.json({ error: "Subscription has no items." }, { status: 502 });
    if (item.price?.id === priceId && !sub.cancel_at_period_end) {
      return NextResponse.json({ ok: true, tier: plan.tier, unchanged: true });
    }

    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
      metadata: { deviceId, tier: plan.tier, interval },
    });

    const periodEnd =
      typeof (updated as unknown as { current_period_end?: number }).current_period_end === "number"
        ? new Date((updated as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
        : license.periodEnd;

    await setLicense(deviceId, {
      tier: plan.tier,
      status: "active",
      customerId: license.customerId ?? (typeof updated.customer === "string" ? updated.customer : undefined),
      subscriptionId: updated.id,
      periodEnd,
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, tier: plan.tier, periodEnd });
  } catch (e) {
    console.error("change-plan failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not change the plan. Try again or use the billing portal." }, { status: 502 });
  }
}
