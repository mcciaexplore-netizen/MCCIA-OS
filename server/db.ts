/**
 * Shared Postgres client, backed by Supabase.
 *
 * Supabase is plain Postgres, so we talk to it over a standard connection
 * (postgres.js) using `DATABASE_URL`. Point that at Supabase's *pooler*
 * connection string (Project Settings → Database → "Connection pooling",
 * Transaction mode, port 6543) — the pooler is what makes this safe under
 * serverless (Vercel functions).
 *
 * The client is created once and reused across warm invocations. Runs only in a
 * trusted server context; `DATABASE_URL` is never exposed to the browser.
 */

import postgres from 'postgres';

let client: ReturnType<typeof postgres> | null = null;

/** The shared postgres.js client (tagged-template SQL), created on first use. */
export function sql(): ReturnType<typeof postgres> {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — point it at your Supabase Postgres connection string.');
  }
  client = postgres(url, {
    // Supabase's transaction pooler (Supavisor) does not support prepared
    // statements; disabling them keeps queries working through the pooler.
    prepare: false,
    // Supabase requires TLS.
    ssl: 'require',
    max: 3,
    idle_timeout: 20,
  });
  return client;
}
