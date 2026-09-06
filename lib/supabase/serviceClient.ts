import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Uses the service_role key, which bypasses Row Level Security entirely.
 *
 * This exists for exactly one purpose in this app: moving a `payments`
 * row's status to 'captured' after the server has independently verified
 * Razorpay's cryptographic signature. Never use this client to read or
 * write anything on behalf of a request you haven't already authenticated,
 * and never import this file from a "use client" component — the
 * `server-only` import above will throw a build error if you try.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
