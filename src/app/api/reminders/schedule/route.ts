import { NextResponse } from "next/server";
import { putSchedule, type ScheduledItem } from "@/lib/push-store";
import { guardApi, bodyTooLarge } from "@/lib/apiGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reminders/schedule
 * Body: { endpoint, deviceId?, items: [{ id, at, title, body, href }] }
 * Replaces the device's schedule. Past-dated items are dropped server-side.
 *
 * Accepts BOTH application/json (fetch) and text/plain (sendBeacon —
 * Beacons made with a Blob typed text/plain survive page teardown;
 * the JSON parser still reads the body fine).
 */
export async function POST(req: Request) {
  const blocked = guardApi(req, { perMinute: 20, perDay: 200 });
  if (blocked) return blocked;
  if (bodyTooLarge(req, 64 * 1024)) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }
  let body: { endpoint?: string; items?: ScheduledItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const endpoint = typeof body?.endpoint === "string" ? body.endpoint.slice(0, 500) : "";
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  const items = Array.isArray(body.items) ? body.items : [];
  const now = Date.now();
  // 120-item ceiling: a corrupt-payload guard, not a real limit. The old 20
  // silently dropped calendar reminders for anyone with multiple daily timed
  // events (5 events x 7-day horizon = 35 rows before habits/tasks).
  const clean: ScheduledItem[] = items
    .slice(0, 120)
    .filter(
      (i) =>
        i &&
        typeof i.id === "string" && i.id.length <= 200 &&
        typeof i.at === "string" && !isNaN(Date.parse(i.at)) && Date.parse(i.at) > now &&
        typeof i.title === "string" && i.title.length <= 120 &&
        typeof i.body === "string" && i.body.length <= 200 &&
        typeof i.href === "string" && i.href.length <= 200
    )
    .map((i) => ({
      id: i.id.slice(0, 200),
      at: i.at,
      title: i.title.slice(0, 120),
      body: i.body.slice(0, 200),
      href: i.href.slice(0, 200),
    }));

  try {
    await putSchedule(endpoint, clean);
    return NextResponse.json({ ok: true, stored: clean.length });
  } catch (e) {
    // The store rejected the write (e.g. suspended Blob + unreachable
    // Supabase). The user MUST know their reminder will not fire —
    // "ok: true" here is how notifications silently died before.
    console.error("[reminders/schedule] store rejected write:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Could not save the reminder schedule. Please try again later." },
      { status: 500 }
    );
  }
}
