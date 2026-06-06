# MCCIA Intern OS

A personal workspace for an AI intern at MCCIA to manage **consulting engagements**, **app development projects**, and **social media creatives** across multiple client companies. Data is stored in **Neon (Postgres)** via lightweight serverless functions and is **private to each signed-in user** — everyone gets the same features, their own data.

## Tech stack

- **React 18 + TypeScript** (Vite)
- **Tailwind CSS** — styling, dark mode via the `class` strategy
- **React Router v6** — navigation, code-split routes
- **TanStack Query** — data fetching, caching, optimistic updates
- **React Hook Form + Zod** — forms & validation
- **Framer Motion** — page transitions & the command palette
- **date-fns** — date utilities
- **Lucide React** — icons · **Sonner** — toasts

## Features

- **Dashboard** that aggregates every module: today's briefing, stat cards, an "attention required" list, upcoming follow-ups, an app-dev snapshot, and a recent-activity feed.
- **Companies, Consulting, App Development (Kanban), Social** modules — each with create/edit drawers, filters, and search.
- **Command palette** (`⌘K` / `Ctrl+K` or `/`) — search across companies, sessions, and projects and jump to any result.
- **Keyboard shortcuts** — `N` = new entry (context-aware per page), `/` = search, `D` = dashboard.
- **Notification bell** — count of overdue items, with a dropdown to jump to each.
- **Authentication** — a profile picker + password backed by [Better Auth](https://better-auth.com) with sessions in Neon. Every data API call requires a valid session.
- **Bulk Excel import / export** — import consultations from an Excel/CSV file, pasted cells, or a public Google Sheets link; export everything back to `.xlsx`.
- **Settings** — preferences (default follow-up interval, theme, timezone) and data management (Excel import/export, export all data as JSON, clear cache).
- **Resilient UX** — optimistic updates with rollback, per-route error boundaries, loading skeletons, and empty/error states everywhere.
- Fully responsive (sidebar on desktop, bottom tab bar on mobile) with light / dark / system themes and no flash on first paint.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL + BETTER_AUTH_SECRET (see below)
npm run db:setup             # create the records table (run once)
npm run dev                  # http://localhost:5173
```

`npm run dev` serves both the data API and the Better Auth routes (`/api/auth/*`)
against the same Neon database as production via a small Vite middleware, so local
and deployed behaviour match. Add companies, sessions, projects, and creatives in
the app and they're saved to Neon. Sign in with one of the seeded accounts (e.g.
`sujal@mcciapune.com`).

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (with the local data API) |
| `npm run db:setup` | Create the Neon schema (idempotent; reads `.env.local`) |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Lint with ESLint (`--max-warnings 0`) |
| `npm test` | Run the Vitest unit suite |
| `npm run test:watch` | Run Vitest in watch mode |

> Users live in the Neon database (Better Auth). Signed-in users change their own
> password in **Settings → Account**. The login picker's names/emojis/emails are
> display metadata in [`src/auth/users.ts`](src/auth/users.ts) — keep its emails in
> sync with the accounts in the database.

## Data & storage

Records live in **Neon (Postgres)**. Each entity is stored in a single generic
`records` table keyed by `(sheet, id)` with the row held as `jsonb` — mirroring
the old "one array per sheet" model, so the evolving data model needs no
per-field migrations. An `owner_id` column scopes every row to the user who
created it, so each user reads and writes only their own data.

The browser never touches the database directly. The frontend store
([`src/api/sheets.ts`](src/api/sheets.ts)) calls same-origin serverless functions
in [`api/`](api/), which run the shared handlers in [`server/`](server/) against
Neon. Its surface (`read / append / update / remove / overwriteMany`, with `id` and
timestamps generated server-side) is unchanged, so the hooks, optimistic updates,
and forms are storage-agnostic.

- **Durable & per-user:** each signed-in user's records are private to them and
  follow them to any device. The server derives the owner from the session — the
  client can't read or write another user's data.
- **Atomic bulk import:** `overwriteMany` replaces the current user's rows for a
  sheet inside a single transaction — all-or-nothing, never a half-written batch.
- **Credentials stay server-side:** `DATABASE_URL` and `BETTER_AUTH_SECRET` are
  only read by the functions and the dev middleware; never bundled into the client.
- **Server-side auth:** every `/api/records` and `/api/bulk` call checks for a
  valid Better Auth session (the browser sends the session cookie automatically);
  no session → `401`.

## Authentication

Real authentication via [Better Auth](https://better-auth.com): email + password,
with users and sessions stored in Neon (the `neon_auth` schema). The flow:

- `server/auth.ts` builds the Better Auth instance (pg pool → Neon `neon_auth`).
- `api/auth/[...all].ts` (and the Vite dev middleware) serve `/api/auth/*`.
- The browser uses [`src/auth/authClient.ts`](src/auth/authClient.ts); `AuthProvider`
  exposes the session to the app, and `<App>` gates every route behind it.
- The data API authorizes each request via the session cookie (see `server/api.ts`).

Manage accounts in the database; signed-in users change their own password in
**Settings → Account**. The login picker's display profiles live in
[`src/auth/users.ts`](src/auth/users.ts).

**Forgot password:** no email provider is wired, so the login's "Forgot password"
flow (`POST /api/reset`, [`server/api.ts`](server/api.ts)) gates on a shared
recovery code (`RESET_CODE`, default `mccia-recovery-2026`) — enter the code and a
new password to reset. Anyone with the code can reset any account, so set a
private `RESET_CODE` in production.

## Deployment

The app deploys to **Vercel** as a static SPA plus the serverless functions in
[`api/`](api/). Set these environment variables in the Vercel project (Settings →
Environment Variables) before deploying:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string (secret). |
| `BETTER_AUTH_SECRET` | Long random string that signs sessions (`openssl rand -base64 32`). Keep stable + secret. |
| `BETTER_AUTH_URL` | The **exact deployed origin** (e.g. `https://your-app.vercel.app`) — Better Auth checks request origins against it. |
| `RESET_CODE` | Optional. Shared recovery code for "Forgot password" (defaults to `mccia-recovery-2026`). |

```bash
npm run build      # type-checks and outputs the SPA to dist/
```

`vercel.json` configures the Vite preset, security headers, and the SPA rewrite.
The `/api/*` functions take precedence over the catch-all rewrite, so the
database API and client routing coexist. Run `npm run db:setup` once against the
production database to create the schema.

## Project structure

```
vercel.json     Build + SPA-routing config for Vercel
api/            Vercel serverless functions: records, bulk, auth/[...all]
server/         Neon data store, API handlers, and Better Auth instance
scripts/        db:setup (schema)
src/
  api/          Remote data store (calls /api) + query keys
  app/          App-level providers (React Query client, Providers)
  auth/         Better Auth client + provider/hook/context + display roster
  components/
    command/    Command palette, global shortcuts, new-action registry
    layout/     App shell (Sidebar, TopBar, MobileNav, ...)
    ui/         Primitives (Button, Card, Badge, Skeleton, SlideOver, ...)
  pages/        Dashboard, Consulting, AppDev, Social, Companies, Settings, Login
  hooks/        Theme provider + data hooks (+ optimistic mutation helpers)
  schemas/      Zod form schemas + mappers
  types/        Domain interfaces + enum unions + CompanyWithStats
  utils/        Date/format/url helpers, consultation import-export, preferences
  constants/    Sheet schema metadata, labels/options, routes, query config
```

## Notes

- Each user's data is private (scoped by `owner_id` in Neon). **Settings → Export
  all data** produces a JSON backup of the current user's data on demand.
- No sample/seed data is included — every view starts empty until you add records.
