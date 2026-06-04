# MCCIA Intern OS

A personal workspace for an AI intern at MCCIA to manage **consulting engagements**, **app development projects**, and **social media creatives** across multiple client companies. Data is stored locally in your browser — no backend, no database, no setup.

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
npm run dev    # http://localhost:5173
```

That's it — no environment variables, no credentials. Add companies, sessions,
projects, and creatives in the app and they're saved immediately.

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Lint with ESLint (`--max-warnings 0`) |
| `npm test` | Run the Vitest unit suite |
| `npm run test:watch` | Run Vitest in watch mode |

> Set or change a login password with `npx tsx scripts/hash-password.ts "new-password"`
> and paste the printed hash into [`src/auth/users.ts`](src/auth/users.ts).

## Data & storage

All records are stored in the browser's **`localStorage`**, one array per entity,
keyed as `mccia:data:<Sheet>`. The data layer ([`src/api/sheets.ts`](src/api/sheets.ts))
exposes `read / append / update / remove` (generating `id`, `createdAt`,
`updatedAt` on write), so the rest of the app — hooks, optimistic updates,
forms — is storage-agnostic.

- **Persistence:** whatever you enter stays until you clear the browser's site
  data. Reloads, restarts, and closing the tab don't erase it.
- **Per-browser/device:** the data lives in the browser you used; it isn't synced
  across machines. Use **Settings → Export all data** to download a JSON backup.
- **Capacity:** `localStorage` holds a few MB — plenty for text records. The only
  realistic way to fill it is attaching many large base64 images to creatives.
- **Resilience:** if a stored blob is ever unreadable it's copied aside under a
  `…:corrupt:<ts>` key rather than silently overwritten, and bulk imports are
  written atomically (all-or-nothing).

> **Security note:** the profile login is a *client-side gate*, not real
> authentication — password hashes ship in the bundle and the data is readable
> from devtools. It keeps casual users out; it is not a cryptographic boundary.
>
> A **Neon (Postgres) backend** is planned to replace browser storage for
> durable, multi-device data and server-side auth. The storage layer is isolated
> behind [`src/api/sheets.ts`](src/api/sheets.ts) so that swap stays localized.

## Deployment

The app is a static SPA — no server or environment variables required. Build it
and host the `dist/` folder anywhere (Vercel, Netlify, GitHub Pages, S3, …):

```bash
npm run build      # outputs to dist/
npm run preview    # optional: preview the production build locally
```

`vercel.json` is included for Vercel (Vite preset + SPA rewrite). On any static
host, just serve `dist/` and rewrite unknown routes to `index.html` for client
routing.

## Project structure

```
vercel.json     Build + SPA-routing config for Vercel
src/
  api/          Local data store (localStorage) + query keys
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

- Data is browser-local and per-device; it isn't synced or shared. Take periodic
  JSON backups from **Settings → Export all data**.
- No sample/seed data is included — every view starts empty until you add records.
