"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in browser (Client Components).
 *
 * This is a singleton by default — calling it multiple times returns the same
 * instance. Safe to call from event handlers, hooks, and effects.
 *
 * Uses only the public anon key (NEXT_PUBLIC_*). Never import service keys here.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
