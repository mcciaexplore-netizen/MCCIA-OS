/**
 * Server-side data store backed by Supabase (Postgres) via its HTTPS data API.
 *
 * Every record lives in a single generic `records` table keyed by `(sheet, id)`
 * with the row itself held as `jsonb`. That mirrors the previous "one array per
 * sheet" model exactly, so the read / append / update / remove / overwriteMany
 * surface maps over without any per-field schema — which keeps the evolving data
 * model free to change without migrations.
 *
 * Talks to Supabase through the shared service-role client in `db.ts`. The schema
 * itself (tables + the overwrite_records function) is created out of band via
 * `supabase/schema.sql` — the data API can't run DDL. Runs only in a trusted
 * server context; the service role key never reaches the browser.
 */

import { supabase } from './db.js';
import { randomUUID } from 'node:crypto';

/** The five known sheets. Anything else is rejected at the API boundary. */
export const SHEETS = [
  'Companies',
  'ConsultingSessions',
  'AppProjects',
  'SocialCreatives',
  'FollowUps',
] as const;

export type Sheet = (typeof SHEETS)[number];

export function isSheet(value: unknown): value is Sheet {
  return typeof value === 'string' && (SHEETS as readonly string[]).includes(value);
}

type Row = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ *
 * CRUD — scoped to one owner (the signed-in user)
 *
 * Every query is filtered by `owner_id`, so each user only ever reads or writes
 * their own rows. The app's features are identical for everyone; the data is
 * partitioned per user id.
 * ------------------------------------------------------------------ */

/** PostgREST caps a single response (default 1000 rows), so page through them. */
const PAGE_SIZE = 1000;

/** All of one owner's rows for a sheet, oldest first (matches append order). */
export async function readSheet<T = Row>(sheet: Sheet, ownerId: string): Promise<T[]> {
  const out: T[] = [];
  // Fetch in stable-ordered pages until a short page signals the end. Scales to
  // tens of thousands of rows without tripping the data API's per-request cap.
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase()
      .from('records')
      .select('data')
      .eq('sheet', sheet)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const r of batch) out.push(r.data as T);
    if (batch.length < PAGE_SIZE) break;
  }
  return out;
}

/** Append a new row owned by `ownerId`; the server owns id + timestamps. */
export async function appendRow<T = Row>(sheet: Sheet, ownerId: string, row: Row): Promise<T> {
  const now = nowIso();
  const id = randomUUID();
  const record: Row = { ...row, id, createdAt: now, updatedAt: now };
  const { error } = await supabase()
    .from('records')
    .insert({ sheet, id, owner_id: ownerId, data: record, created_at: now, updated_at: now });
  if (error) throw new Error(error.message);
  return record as T;
}

/** Merge `fields` into one of the owner's rows and bump `updatedAt`. */
export async function updateRow<T = Row>(
  sheet: Sheet,
  ownerId: string,
  id: string,
  fields: Row
): Promise<T> {
  const { data: existing, error: selectError } = await supabase()
    .from('records')
    .select('data')
    .eq('sheet', sheet)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (!existing) throw new Error(`No record with id "${id}" in "${sheet}".`);

  const now = nowIso();
  const merged: Row = { ...(existing.data as Row), ...fields, id, updatedAt: now };
  const { error } = await supabase()
    .from('records')
    .update({ data: merged, updated_at: now })
    .eq('sheet', sheet)
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
  return merged as T;
}

/** Delete one of the owner's rows. */
export async function removeRow(
  sheet: Sheet,
  ownerId: string,
  id: string
): Promise<{ id: string }> {
  const { error } = await supabase()
    .from('records')
    .delete()
    .eq('sheet', sheet)
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
  return { id };
}

/**
 * Atomically replace the contents of one or more sheets FOR THIS OWNER (only the
 * owner's rows are cleared/rewritten — other users' data is untouched). PostgREST
 * has no multi-statement transactions, so we fill any gaps (id + timestamps) here
 * and hand the whole batch to the `overwrite_records` Postgres function, which
 * does the delete+insert in one transaction — all-or-nothing, never half-written.
 */
export async function overwriteMany(
  ownerId: string,
  updates: { sheet: Sheet; rows: Row[] }[]
): Promise<void> {
  const payload = updates.map(({ sheet, rows }) => ({
    sheet,
    rows: rows.map((row) => {
      const id = typeof row.id === 'string' && row.id ? row.id : randomUUID();
      const createdAt = typeof row.createdAt === 'string' && row.createdAt ? row.createdAt : nowIso();
      const updatedAt = typeof row.updatedAt === 'string' && row.updatedAt ? row.updatedAt : createdAt;
      return { ...row, id, createdAt, updatedAt };
    }),
  }));

  const { error } = await supabase().rpc('overwrite_records', {
    p_owner: ownerId,
    p_updates: payload,
  });
  if (error) throw new Error(error.message);
}
