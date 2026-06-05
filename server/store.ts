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
      data       jsonb       not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (sheet, id)
    )`;
  await db`create index if not exists records_sheet_created_idx on records (sheet, created_at)`;
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
 * CRUD — mirrors the old LocalDataStore surface
 * ------------------------------------------------------------------ */

/** All rows of a sheet, oldest first (matches the old append order). */
export async function readSheet<T = Row>(sheet: Sheet): Promise<T[]> {
  const rows = await sql()`
    select data from records
    where sheet = ${sheet}
    order by created_at asc, id asc`;
  return rows.map((r) => r.data as T);
}

/** Append a new row; the server owns `id`, `createdAt`, `updatedAt`. */
export async function appendRow<T = Row>(sheet: Sheet, row: Row): Promise<T> {
  const now = nowIso();
  const id = randomUUID();
  const record: Row = { ...row, id, createdAt: now, updatedAt: now };
  await sql()`
    insert into records (sheet, id, data, created_at, updated_at)
    values (${sheet}, ${id}, ${JSON.stringify(record)}::jsonb, ${now}, ${now})`;
  return record as T;
}

/** Merge `fields` into one row and bump `updatedAt`. */
export async function updateRow<T = Row>(sheet: Sheet, id: string, fields: Row): Promise<T> {
  const existing = await sql()`select data from records where sheet = ${sheet} and id = ${id}`;
  if (existing.length === 0) throw new Error(`No record with id "${id}" in "${sheet}".`);
  const now = nowIso();
  const merged: Row = { ...(existing[0].data as Row), ...fields, id, updatedAt: now };
  await sql()`
    update records set data = ${JSON.stringify(merged)}::jsonb, updated_at = ${now}
    where sheet = ${sheet} and id = ${id}`;
  return merged as T;
}

/** Delete one row. */
export async function removeRow(sheet: Sheet, id: string): Promise<{ id: string }> {
  await sql()`delete from records where sheet = ${sheet} and id = ${id}`;
  return { id };
}

/**
 * Atomically replace the full contents of one or more sheets in a single
 * transaction. The given rows are full records (they already carry id +
 * timestamps from the import); we preserve those and only fill in any gaps, so a
 * bulk import is all-or-nothing — it never leaves a half-written batch behind.
 */
export async function overwriteMany(updates: { sheet: Sheet; rows: Row[] }[]): Promise<void> {
  const db = sql();
  const queries: ReturnType<typeof db>[] = [];
  for (const { sheet, rows } of updates) {
    queries.push(db`delete from records where sheet = ${sheet}`);
    for (const row of rows) {
      const id = typeof row.id === 'string' && row.id ? row.id : randomUUID();
      const createdAt = typeof row.createdAt === 'string' && row.createdAt ? row.createdAt : nowIso();
      const updatedAt = typeof row.updatedAt === 'string' && row.updatedAt ? row.updatedAt : createdAt;
      const record: Row = { ...row, id, createdAt, updatedAt };
      queries.push(db`
        insert into records (sheet, id, data, created_at, updated_at)
        values (${sheet}, ${id}, ${JSON.stringify(record)}::jsonb, ${createdAt}, ${updatedAt})`);
    }
  }
  await db.transaction(queries);
}
