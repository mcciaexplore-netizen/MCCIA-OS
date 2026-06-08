-- MCCIA Intern OS — Supabase schema
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Idempotent: only creates objects if they don't already exist / replaces the
-- function. After this, run supabase/seed.sql to create the user accounts.
--
-- The app reaches Supabase server-side with the SERVICE ROLE key (see
-- server/db.ts), which bypasses RLS. RLS is still enabled below so the public
-- (anon / publishable) key can't touch this data — defence in depth.

-- Users for the passwordless email login. We manage this table ourselves
-- (NOT Supabase Auth) — login just checks that the email exists, then issues a
-- signed session cookie. See server/users.ts + server/session.ts.
-- Keep emails lower-case (login lower-cases the input before matching).
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

-- Lock both tables to the service role only (no anon/publishable access). The
-- server uses the service role key, which bypasses RLS; with RLS enabled and no
-- policies, the public key is denied.
alter table public.users   enable row level security;
alter table public.records enable row level security;

-- Atomic bulk replace for one owner. The data API (PostgREST) can't run
-- multi-statement transactions, so overwriteMany() calls this function instead.
-- p_updates is [{ "sheet": "...", "rows": [ <full record objects> ] }, ...];
-- each record already carries id / createdAt / updatedAt (filled in by the app).
create or replace function public.overwrite_records(p_owner uuid, p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u jsonb;
  r jsonb;
begin
  for u in select * from jsonb_array_elements(p_updates)
  loop
    delete from public.records
      where owner_id = p_owner and sheet = (u ->> 'sheet');

    for r in select * from jsonb_array_elements(coalesce(u -> 'rows', '[]'::jsonb))
    loop
      insert into public.records (sheet, id, owner_id, data, created_at, updated_at)
      values (
        u ->> 'sheet',
        r ->> 'id',
        p_owner,
        r,
        coalesce((r ->> 'createdAt')::timestamptz, now()),
        coalesce((r ->> 'updatedAt')::timestamptz, now())
      );
    end loop;
  end loop;
end;
$$;
