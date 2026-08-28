"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let _client: SupabaseClient | null = null;

/** Detect if running inside Electron desktop app. */
const isElectron = typeof window !== "undefined" && !!window.lexisDesktop;

/** Singleton Supabase client. Returns null if env vars are missing. */
export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // In Electron, use redirect flow (stays in the BrowserWindow).
      // In browser, use popup flow (default).
      flowType: isElectron ? "pkce" : "implicit",
    },
  });
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}
