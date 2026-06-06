/**
 * User lookups for the passwordless login, backed by Neon.
 *
 * Reads the existing `neon_auth."user"` table (provisioned originally by Better
 * Auth) — id, email, name, role. There is no password here; the credential hash
 * lived in a separate `account` table and has been dropped. Login simply checks
 * that an email exists and issues a session token (see `server/session.ts`).
 *
 * Tables are schema-qualified (`neon_auth."user"`), so no `search_path` games are
 * needed and the Neon HTTP driver/pooler works fine.
 *
 * Runs server-side only; `DATABASE_URL` never reaches the browser.
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/** The fields the app needs about a user. */
export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
}

let cachedSql: NeonQueryFunction<false, false> | null = null;

function sql(): NeonQueryFunction<false, false> {
  if (cachedSql) return cachedSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set — point it at the Neon connection string.');
  cachedSql = neon(url);
  return cachedSql;
}

function toUser(row: Record<string, unknown> | undefined): DbUser | null {
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ''),
    role: (row.role as string | null) ?? null,
  };
}

/** Find a user by email (case-insensitive). Null if no such account exists. */
export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const rows = await sql()`
    select id, email, name, role
    from neon_auth."user"
    where lower(email) = lower(${email})
    limit 1`;
  return toUser(rows[0]);
}

/** Re-read a user by id (to reflect name/role changes and confirm existence). */
export async function getUserById(id: string): Promise<DbUser | null> {
  const rows = await sql()`
    select id, email, name, role
    from neon_auth."user"
    where id = ${id}::uuid
    limit 1`;
  return toUser(rows[0]);
}

/** Update a user's display name; returns the updated row, or null if missing. */
export async function updateUserName(id: string, name: string): Promise<DbUser | null> {
  const rows = await sql()`
    update neon_auth."user"
    set name = ${name}, "updatedAt" = now()
    where id = ${id}::uuid
    returning id, email, name, role`;
  return toUser(rows[0]);
}
