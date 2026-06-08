/**
 * User lookups for the passwordless login, backed by Supabase (Postgres).
 *
 * Reads the `users` table — id, email, name, role. There is no password; login
 * simply checks that an email exists and issues a session token (see
 * `server/session.ts`). We manage this table ourselves (created by `ensureSchema`
 * in store.ts / supabase/schema.sql), separate from Supabase Auth.
 *
 * Runs server-side only; `DATABASE_URL` never reaches the browser.
 */

import { sql } from './db.js';

/** The fields the app needs about a user. */
export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
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
    from users
    where lower(email) = lower(${email})
    limit 1`;
  return toUser(rows[0]);
}

/** Re-read a user by id (to reflect name/role changes and confirm existence). */
export async function getUserById(id: string): Promise<DbUser | null> {
  const rows = await sql()`
    select id, email, name, role
    from users
    where id = ${id}::uuid
    limit 1`;
  return toUser(rows[0]);
}

/** Update a user's display name; returns the updated row, or null if missing. */
export async function updateUserName(id: string, name: string): Promise<DbUser | null> {
  const rows = await sql()`
    update users
    set name = ${name}, updated_at = now()
    where id = ${id}::uuid
    returning id, email, name, role`;
  return toUser(rows[0]);
}
