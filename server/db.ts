/**
 * Shared Supabase client (server-side, service role).
 *
 * We talk to Supabase over its HTTPS data API (`@supabase/supabase-js`) rather
 * than a raw Postgres connection — no connection pooling, no IPv6/pooler quirks,
 * which suits Vercel's serverless functions.
 *
 * This uses the SERVICE ROLE key, so it bypasses Row Level Security and has full
 * access. That's safe because it only ever runs server-side (Vercel functions +
 * the Vite dev middleware) and our own handlers enforce per-user scoping via
 * `owner_id`. The service role key must NEVER reach the browser.
 *
 * The client is created once and reused across warm invocations.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** The shared service-role Supabase client, created on first use. */
export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('SUPABASE_URL is not set — your Supabase project URL (https://<ref>.supabase.co).');
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set — the secret service-role key from Supabase → Settings → API.'
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
