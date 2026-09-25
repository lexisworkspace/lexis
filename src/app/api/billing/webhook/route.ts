import { NextResponse } from "next/server";
import Stripe from "stripe";
import { setLicense, deleteLicense, type StoredLicense } from "@/lib/billing-store";
import type { Tier } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe -> Blob license sync. The deviceId rides in client_reference_id
// AND metadata (both set at checkout), so every event type can resolve it.
function deviceIdFrom(obj: Stripe.Charge | Stripe.Subscription | Stripe.Checkout.Session | null | undefined): string | null {
  if (!obj) return null;
  const md = (obj.metadata || {}) as Record<string, string>;
  if (md.deviceId) return md.deviceId;
  if ("client_reference_id" in obj && obj.client_reference_id) return obj.client_reference_id;
  return null;
}

function tierFromPriceId(priceId: string | undefined | null): Tier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PLUS_MONTHLY || priceId === process.env.STRIPE_PRICE_PLUS_YEARLY) return "plus";
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY || priceId === process.env.STRIPE_PRICE_PRO_YEARLY) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ULTRA_MONTHLY || priceId === process.env.STRIPE_PRICE_ULTRA_YEARLY) return "ultra";
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });
  }
  const stripe = new Stripe(secret);

  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const deviceId = deviceIdFrom(session);
        if (!deviceId) break;
        const sub = (await stripe.subscriptions.retrieve(session.subscription as string)) as unknown as {
          id: string;
          current_period_end: number;
          items: { data: Array<{ price?: { id?: string } }> };
        };
        const tier = tierFromPriceId(sub.items.data[0]?.price?.id) || "plus";
        await setLicense(deviceId, {
          tier,
          status: "active",
          customerId: typeof session.customer === "string" ? session.customer : undefined,
          subscriptionId: sub.id,
          periodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        });
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = typeof (sub as unknown as { current_period_end?: number }).current_period_end === "number"
          ? (sub as unknown as { current_period_end: number }).current_period_end
          : null;
        const deviceId = deviceIdFrom(sub);
        if (!deviceId) break;
        const item = sub.items.data[0];
        const tier = tierFromPriceId(item?.price?.id) || "plus";
        const active = sub.status === "active" || sub.status === "trialing";
        // Keep the scheduled-cancellation flag in sync with Stripe so the
        // app's "plan ends on <date>" banner survives webhook rewrites.
        const capEnd = (sub as unknown as { cancel_at_period_end?: boolean }).cancel_at_period_end;
        await setLicense(deviceId, {
          tier,
          status: active ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
          subscriptionId: sub.id,
          periodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
          cancelAtPeriodEnd: capEnd === true ? true : capEnd === false ? false : undefined,
          updatedAt: new Date().toISOString(),
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const deviceId = deviceIdFrom(sub);
        if (deviceId) await deleteLicense(deviceId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // Never 500 after signature verification — Stripe retries on error and
    // this handler is idempotent per event type anyway.
    console.error("webhook handler error", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ received: true });
}
