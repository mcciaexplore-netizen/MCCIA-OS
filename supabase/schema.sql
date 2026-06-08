-- MCCIA Intern OS — Supabase schema
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query),
-- or via `npm run db:setup` (which calls ensureSchema() with the same DDL).
-- Idempotent: only creates tables/indexes if they don't already exist.
--
-- After this, run supabase/seed.sql to create the four user accounts.

-- Users for the passwordless email login. We manage this table ourselves
-- (NOT Supabase Auth) — login just checks that the email exists, then issues a
-- signed session cookie. See server/users.ts + server/session.ts.
create table if not exists public.users (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  name       text        not null default '',
  role       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- All app records: one generic table keyed by (sheet, id), the full row held as
-- jsonb, scoped to the owning user via owner_id. The evolving data model needs
-- no per-field migrations because everything lives in `data`.
create table if not exists public.records (
  sheet      text        not null,
  id         text        not null,
  owner_id   uuid,
  data       jsonb       not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (sheet, id)
);

create index if not exists records_owner_sheet_idx
  on public.records (owner_id, sheet, created_at);
