// Orleia relay API — health check / diagnostics endpoint only.
// Core sync goes through Supabase directly from the client.
// No wildcard CORS: same-origin only (the browser default when no
// Access-Control-Allow-Origin header is sent).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const securityHeaders = {
  "Cache-Control": "no-store",
};

export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: Date.now() }, { headers: securityHeaders });
}

export async function POST() {
  return NextResponse.json({ status: "ok", timestamp: Date.now() }, { headers: securityHeaders });
}

export async function PUT() {
  return NextResponse.json({ status: "ok", timestamp: Date.now() }, { headers: securityHeaders });
}
