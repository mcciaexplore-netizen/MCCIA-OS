# MCCIA Intern OS

A personal workspace for an AI intern at MCCIA to manage **consulting engagements**, **app development projects**, and **social media creatives** across multiple client companies. Data is stored in a shared **Neon (Postgres)** database via lightweight serverless functions, so records are durable and visible to every signed-in user on any device.

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
- **Profile login** — a password-gated profile picker guards the workspace (client-side gate — see the Security note under *Data & storage*).
- **Bulk Excel import / export** — import consultations from an Excel/CSV file, pasted cells, or a public Google Sheets link; export everything back to `.xlsx`.
- **Settings** — preferences (default follow-up interval, theme, timezone) and data management (Excel import/export, export all data as JSON, clear cache).
- **Resilient UX** — optimistic updates with rollback, per-route error boundaries, loading skeletons, and empty/error states everywhere.
- Fully responsive (sidebar on desktop, bottom tab bar on mobile) with light / dark / system themes and no flash on first paint.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL (Neon connection string)
npm run db:setup             # create the database schema (run once)
npm run dev                  # http://localhost:5173
```

`npm run dev` serves the data API from the same Neon database as production via a
small Vite middleware, so local and deployed behaviour match. Add companies,
sessions, projects, and creatives in the app and they're saved to Neon.

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

> Set or change a login password with `npx tsx scripts/hash-password.ts "new-password"`
> and paste the printed hash into [`src/auth/users.ts`](src/auth/users.ts).

## Data & storage

Records live in a shared **Neon (Postgres)** database. Each entity is stored in a
single generic `records` table keyed by `(sheet, id)` with the row held as
`jsonb` — mirroring the old "one array per sheet" model, so the evolving data
model needs no per-field migrations.

The browser never touches the database directly. The frontend store
([`src/api/sheets.ts`](src/api/sheets.ts)) calls same-origin serverless functions
in [`api/`](api/), which run the shared handlers in [`server/`](server/) against
Neon. Its surface (`read / append / update / remove / overwriteMany`, with `id` and
timestamps generated server-side) is unchanged, so the hooks, optimistic updates,
and forms are storage-agnostic.

- **Durable & shared:** what anyone enters is saved to Neon and visible to every
  signed-in user, on any device.
- **Atomic bulk import:** `overwriteMany` replaces a sheet's contents inside a
  single transaction — all-or-nothing, never a half-written batch.
- **Credentials stay server-side:** `DATABASE_URL` is only read by the functions
  and the dev middleware; it is never bundled into the client.

> **Security note:** the profile login is a *client-side gate*, not real
> authentication — password hashes ship in the bundle. The data API is guarded
> only by a shared `APP_API_KEY` (which also ships in the bundle), so it is the
> same "keeps casual users out" tier, not a per-user authorization boundary. For
> real security, add server-side sessions/login in front of the API.

## Deployment

The app deploys to **Vercel** as a static SPA plus the serverless functions in
[`api/`](api/). Set these environment variables in the Vercel project (Settings →
Environment Variables) before deploying:

| Variable | Scope | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Server | Neon connection string (secret). |
| `APP_API_KEY` | Server | Shared key the API requires; pick any random string. |
| `VITE_APP_API_KEY` | Build | Must equal `APP_API_KEY` so the client can call the API. |

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
api/            Vercel serverless functions (records, bulk) — thin adapters
server/         Neon-backed data store + runtime-agnostic API handlers
scripts/        db:setup (schema) + hash-password helper
src/
  api/          Remote data store (calls /api) + query keys
  app/          App-level providers (React Query client, Providers)
  auth/         Profile login: context/provider/hook, roster, password hashing
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

- Data is shared across all users via Neon. **Settings → Export all data** still
  produces a JSON backup on demand.
- No sample/seed data is included — every view starts empty until you add records.
