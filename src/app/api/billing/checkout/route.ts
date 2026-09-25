import { NextResponse } from "next/server";
import Stripe from "stripe";
import { guardApi } from "@/lib/apiGuard";
import { billingConfigured, planByTier, stripePriceFor, type BillingInterval } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = guardApi(req, { perMinute: 6, perDay: 40 });
  if (denied) return denied;

  if (!billingConfigured()) {
    return NextResponse.json({ error: "Billing is launching soon." }, { status: 503 });
  }

  let body: { tier?: string; interval?: string; deviceId?: string };
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

  const priceId = stripePriceFor(plan.tier, interval);
  if (!priceId) return NextResponse.json({ error: "Billing is launching soon." }, { status: 503 });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    // Pin redirect URLs to canonical hosts - never echo request-supplied Origin.
    const origin = "https://app.orleia.app";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Anonymous licensing: the device id is the only identity we track.
      client_reference_id: deviceId,
      metadata: { deviceId, tier: plan.tier, interval },
      subscription_data: { metadata: { deviceId, tier: plan.tier, interval } },
      allow_promotion_codes: true,
      success_url: `${origin}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?billing=cancelled`,
      automatic_tax: { enabled: true },
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not start checkout. Try again." }, { status: 502 });
  }
}
