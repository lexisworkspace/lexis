import { NextResponse } from "next/server";
import Stripe from "stripe";
import { guardApi } from "@/lib/apiGuard";
import { billingConfigured } from "@/lib/plans";
import { getLicense } from "@/lib/billing-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (!license.customerId || license.tier === "free") {
    return NextResponse.json({ error: "No subscription to manage." }, { status: 404 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const origin = req.headers.get("origin") || "https://app.orleia.app";
    const session = await stripe.billingPortal.sessions.create({
      customer: license.customerId,
      return_url: `${origin}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("portal failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not open the billing portal." }, { status: 502 });
  }
}
