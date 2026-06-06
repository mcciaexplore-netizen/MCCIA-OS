/**
 * Server-side data store backed by Neon (Postgres).
 *
 * This is the durable replacement for the old browser-local store: every record
 * lives in a single generic `records` table keyed by `(sheet, id)` with the row
 * itself held as `jsonb`. That mirrors the previous "one array per sheet" model
 * exactly, so the existing read / append / update / remove / overwriteMany surface
 * maps over without any per-field schema — which keeps the evolving data model
 * free to change without migrations.
 *
 * Runs only in a trusted server context (Vercel function or the Vite dev
 * middleware). The `DATABASE_URL` it reads is never exposed to the browser.
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
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

let cachedSql: NeonQueryFunction<false, false> | null = null;

function sql(): NeonQueryFunction<false, false> {
  if (cachedSql) return cachedSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — point it at the Neon connection string.');
  }
  cachedSql = neon(url);
  return cachedSql;
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ *
 * Schema bootstrap (idempotent, runs at most once per cold start)
 * ------------------------------------------------------------------ */

export async function ensureSchema(): Promise<void> {
  const db = sql();
  await db`
    create table if not exists records (
      sheet      text        not null,
      id         text        not null,
      owner_id   uuid,
      data       jsonb       not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (sheet, id)
    )`;
  // `owner_id` scopes every record to the user who created it (added after the
  // table first shipped, so guard with "if not exists").
  await db`alter table records add column if not exists owner_id uuid`;
  await db`create index if not exists records_owner_sheet_idx on records (owner_id, sheet, created_at)`;
}

let schemaReady: Promise<void> | null = null;

/** Ensure the schema exists, but only do the work once per process. */
export function ensureSchemaOnce(): Promise<void> {
  if (!schemaReady) {
    schemaReady = ensureSchema().catch((error) => {
      schemaReady = null; // let a later request retry if this one failed
      throw error;
    });
  }
  return schemaReady;
}

/* ------------------------------------------------------------------ *
 * CRUD — scoped to one owner (the signed-in user)
 *
 * Every query is filtered by `owner_id`, so each user only ever reads or writes
 * their own rows. The app's features are identical for everyone; the data is
 * partitioned per user id.
 * ------------------------------------------------------------------ */

/** All of one owner's rows for a sheet, oldest first (matches append order). */
export async function readSheet<T = Row>(sheet: Sheet, ownerId: string): Promise<T[]> {
  const rows = await sql()`
    select data from records
    where sheet = ${sheet} and owner_id = ${ownerId}
    order by created_at asc, id asc`;
  return rows.map((r) => r.data as T);
}

/** Append a new row owned by `ownerId`; the server owns id + timestamps. */
export async function appendRow<T = Row>(sheet: Sheet, ownerId: string, row: Row): Promise<T> {
  const now = nowIso();
  const id = randomUUID();
  const record: Row = { ...row, id, createdAt: now, updatedAt: now };
  await sql()`
    insert into records (sheet, id, owner_id, data, created_at, updated_at)
    values (${sheet}, ${id}, ${ownerId}, ${JSON.stringify(record)}::jsonb, ${now}, ${now})`;
  return record as T;
}

/** Merge `fields` into one of the owner's rows and bump `updatedAt`. */
export async function updateRow<T = Row>(
  sheet: Sheet,
  ownerId: string,
  id: string,
  fields: Row
): Promise<T> {
  const existing = await sql()`
    select data from records where sheet = ${sheet} and id = ${id} and owner_id = ${ownerId}`;
  if (existing.length === 0) throw new Error(`No record with id "${id}" in "${sheet}".`);
  const now = nowIso();
  const merged: Row = { ...(existing[0].data as Row), ...fields, id, updatedAt: now };
  await sql()`
    update records set data = ${JSON.stringify(merged)}::jsonb, updated_at = ${now}
    where sheet = ${sheet} and id = ${id} and owner_id = ${ownerId}`;
  return merged as T;
}

/** Delete one of the owner's rows. */
export async function removeRow(
  sheet: Sheet,
  ownerId: string,
  id: string
): Promise<{ id: string }> {
  await sql()`delete from records where sheet = ${sheet} and id = ${id} and owner_id = ${ownerId}`;
  return { id };
}

/**
 * Atomically replace the contents of one or more sheets FOR THIS OWNER in a
 * single transaction (only the owner's rows are cleared/rewritten — other users'
 * data is untouched). The given rows are full records (they already carry id +
 * timestamps from the import); we preserve those and fill any gaps, so a bulk
 * import is all-or-nothing — never a half-written batch.
 */
export async function overwriteMany(
  ownerId: string,
  updates: { sheet: Sheet; rows: Row[] }[]
): Promise<void> {
  const db = sql();
  const queries: ReturnType<typeof db>[] = [];
  for (const { sheet, rows } of updates) {
    queries.push(db`delete from records where sheet = ${sheet} and owner_id = ${ownerId}`);
    for (const row of rows) {
      const id = typeof row.id === 'string' && row.id ? row.id : randomUUID();
      const createdAt = typeof row.createdAt === 'string' && row.createdAt ? row.createdAt : nowIso();
      const updatedAt = typeof row.updatedAt === 'string' && row.updatedAt ? row.updatedAt : createdAt;
      const record: Row = { ...row, id, createdAt, updatedAt };
      queries.push(db`
        insert into records (sheet, id, owner_id, data, created_at, updated_at)
        values (${sheet}, ${id}, ${ownerId}, ${JSON.stringify(record)}::jsonb, ${createdAt}, ${updatedAt})`);
    }
  }
  await db.transaction(queries);
}
