// Lexis relay API — now a health check / fallback endpoint.
// Core sync goes through Supabase directly from the client.
// Kept for backward compatibility and diagnostics.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  return NextResponse.json(
    { status: "ok", backend: "supabase", timestamp: Date.now() },
    { headers: corsHeaders }
  );
}

export async function POST() {
  return NextResponse.json(
    { status: "ok", backend: "supabase", timestamp: Date.now() },
    { headers: corsHeaders }
  );
}

export async function PUT() {
  return NextResponse.json(
    { status: "ok", backend: "supabase", timestamp: Date.now() },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
