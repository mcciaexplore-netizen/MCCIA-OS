/**
 * Better Auth server instance (lazy).
 *
 * Backs the `/api/auth/*` routes and the data API's session check. The Better
 * Auth tables were provisioned in Neon under the `neon_auth` schema, so we point
 * a pg pool at the DIRECT (non-pooler) host and set `search_path` to that schema
 * — the pooler (pgbouncer, transaction mode) won't honour the `options` startup
 * param, the direct endpoint does. The `id` columns default to
 * `gen_random_uuid()`, so `generateId: false` lets Postgres mint ids.
 *
 * Built lazily via `getAuth()` so importing this module has no side effects and
 * doesn't read env at load time (the Vite dev middleware lifts env vars into
 * `process.env` only after the config module is imported). Runs server-side
 * only; the DB credentials never reach the browser.
 */

import { betterAuth } from 'better-auth';
import pg from 'pg';

function neonDirectConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set — point it at the Neon connection string.');
  // Direct endpoint + drop channel_binding (node-postgres doesn't parse it).
  return url.replace('-pooler', '').replace(/[?&]channel_binding=require/, (m) =>
    m.startsWith('?') ? '?' : ''
  );
}

let pool: pg.Pool | null = null;

function createAuth() {
  // Module-scoped pool: reused across warm serverless invocations.
  pool ??= new pg.Pool({
    connectionString: neonDirectConnectionString(),
    options: '-c search_path=neon_auth,public',
    max: 3,
  });

  return betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      // The shared seed password (mccia26) is 7 chars; allow it.
      minPasswordLength: 6,
    },
    // `id` columns default to gen_random_uuid() — let the database generate them.
    advanced: { database: { generateId: false } },
  });
}

let authInstance: ReturnType<typeof createAuth> | null = null;

/** The shared Better Auth instance, created on first use and cached. */
export function getAuth(): ReturnType<typeof createAuth> {
  authInstance ??= createAuth();
  return authInstance;
}
