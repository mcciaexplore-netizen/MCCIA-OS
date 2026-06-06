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
- **Email-only sign-in** — passwordless login: enter your email and, if it exists in the database, you're signed straight in (session in a signed HttpOnly cookie). Each user gets their own private data.
- **Bulk Excel import / export** — import consultations from an Excel/CSV file, pasted cells, or a public Google Sheets link; export everything back to `.xlsx`.
- **Settings** — preferences (default follow-up interval, theme, timezone) and data management (Excel import/export, export all data as JSON, clear cache).
- **Resilient UX** — optimistic updates with rollback, per-route error boundaries, loading skeletons, and empty/error states everywhere.
- Fully responsive (sidebar on desktop, bottom tab bar on mobile) with light / dark / system themes and no flash on first paint.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL + AUTH_SECRET (see below)
npm run db:setup             # create the records table (run once)
npm run dev                  # http://localhost:5173
```

`npm run dev` serves both the data API and the auth routes (`/api/login`,
`/api/me`, `/api/logout`) against the same Neon database as production via a small
Vite middleware, so local and deployed behaviour match. Add companies, sessions,
projects, and creatives in the app and they're saved to Neon. Sign in with one of
the seeded accounts (e.g. `sujal@mcciapune.com`).

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (with the local data API) |
| `npm run db:setup` | Create the Neon schema (idempotent; reads `.env.local`) |
| `npm run db:drop-password` | Drop the dead `neon_auth.account.password` column (passwordless migration) |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Lint with ESLint (`--max-warnings 0`) |
| `npm test` | Run the Vitest unit suite |
| `npm run test:watch` | Run Vitest in watch mode |

> Users live in the Neon database (`neon_auth."user"`). There are no passwords —
> login is email-only. Signed-in users edit their display name in **Settings →
> Account**. The login screen's names/emojis/emails are display metadata in
> [`src/auth/users.ts`](src/auth/users.ts) — keep its emails in sync with the
> accounts in the database.

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
- **Credentials stay server-side:** `DATABASE_URL` and `AUTH_SECRET` are only read
  by the functions and the dev middleware; never bundled into the client.
- **Server-side auth:** every `/api/records` and `/api/bulk` call verifies the
  session token in the cookie (the browser sends it automatically); no valid
  token → `401`.

## Authentication

Login is **email-only and passwordless**: the user enters their email, and if it
exists in `neon_auth."user"` the server issues a signed session token (an HS256
JWT) in an HttpOnly cookie. No password, no OTP, no magic link — this is an
internal tool for trusted users, so the only check is "the email exists". The data
API identifies each user from that token for per-user data isolation.

- `server/session.ts` mints/verifies the JWT (`node:crypto` HMAC) and the cookie.
- `server/users.ts` looks users up in Neon; `server/authApi.ts` has the handlers.
- `api/login.ts`, `api/me.ts`, `api/logout.ts` (and the Vite dev middleware) serve
  the routes.
- The browser uses [`src/auth/authClient.ts`](src/auth/authClient.ts); `AuthProvider`
  exposes the session to the app, and `<App>` gates every route behind it.
- The data API authorizes each request via the cookie (see `server/api.ts`).

> **No authentication boundary:** there's no password, so anyone who knows a valid
> email can sign in as that user. Each user's data stays separate, but it isn't
> protected. To require real auth you'd reintroduce a credential check in the
> login flow. The login screen's display profiles live in
> [`src/auth/users.ts`](src/auth/users.ts).

## Deployment

The app deploys to **Vercel** as a static SPA plus the serverless functions in
[`api/`](api/). Set these environment variables in the Vercel project (Settings →
Environment Variables) before deploying:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon connection string (secret). |
| `AUTH_SECRET` | Long random string that signs the session token (`openssl rand -base64 32`). Keep stable + secret. (`BETTER_AUTH_SECRET` is still accepted as a fallback.) |

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
api/            Vercel serverless functions: records, bulk, login, me, logout
server/         Neon data store, API handlers, session tokens, user lookups
scripts/        db:setup (schema), db:drop-password (migration) + migrations/
src/
  api/          Remote data store (calls /api) + query keys
  app/          App-level providers (React Query client, Providers)
  auth/         Auth client + provider/hook/context + display roster
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
