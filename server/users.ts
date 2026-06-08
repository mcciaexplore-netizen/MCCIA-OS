/**
 * User lookups for the passwordless login, backed by Supabase.
 *
 * Reads the `users` table — id, email, name, role — through the service-role
 * client (see db.ts). There is no password; login simply checks that an email
 * exists and issues a session token (see server/session.ts). We manage this
 * table ourselves (supabase/schema.sql / seed.sql), separate from Supabase Auth.
 *
 * Emails are stored lower-case (see seed.sql), and we lower-case the input here,
 * so matching is effectively case-insensitive.
 *
 * Runs server-side only; the service role key never reaches the browser.
 */

import { supabase } from './db.js';

/** The fields the app needs about a user. */
export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
}

const USER_COLUMNS = 'id, email, name, role';

function toUser(row: Record<string, unknown> | null | undefined): DbUser | null {
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
  const { data, error } = await supabase()
    .from('users')
    .select(USER_COLUMNS)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return toUser(data);
}

/** Re-read a user by id (to reflect name/role changes and confirm existence). */
export async function getUserById(id: string): Promise<DbUser | null> {
  const { data, error } = await supabase()
    .from('users')
    .select(USER_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return toUser(data);
}

/** Update a user's display name; returns the updated row, or null if missing. */
export async function updateUserName(id: string, name: string): Promise<DbUser | null> {
  const { data, error } = await supabase()
    .from('users')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(USER_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return toUser(data);
}
