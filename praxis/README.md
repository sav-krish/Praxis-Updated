# Praxis (Teach Together)

## Project overview

Interactive decision-based classroom simulations for higher education — professors author branching scenarios (with optional AI-assisted generation from uploads); students join live sessions via a short join code without accounts.

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | Next.js **16** (App Router), React **19** |
| Package manager | **pnpm** workspace (repo root installs `praxis` package; see root `pnpm-workspace.yaml`) |
| Styling | Tailwind CSS **4** (`@tailwindcss/postcss`), shadcn/ui (Radix), `tailwind-merge`, `clsx` |
| Data | **Supabase** (PostgreSQL, Auth, Realtime); types in [`src/types/database.ts`](src/types/database.ts) |
| AI | **OpenAI** via `openai` SDK + structured pipelines (`src/lib/openai-pipeline.ts`, `openai-schemas.ts`) |
| Payments (optional) | **Stripe** checkout + webhook for subscriptions |
| Email (optional) | **Resend** (`src/lib/email/resend-service.ts`) |
| Lint / TS | ESLint (flat config), TypeScript strict (`tsconfig.json`) |

See [`package.json`](package.json) for exact dependency versions.

## Getting started

1. **Clone** the repo and use the **repository root** as cwd (workspace root containing `pnpm-workspace.yaml`).

2. **Install**
   ```bash
   pnpm install
   ```

3. **Environment** — copy the example file under the app folder (committed template; no secrets):
   ```bash
   cp praxis/.env.local.example praxis/.env.local
   ```
   Edit **`praxis/.env.local`** (create it from the example above) with real Supabase URL/keys and `OPENAI_API_KEY` where you use AI. Variables are documented in [`.env.local.example`](./.env.local.example).

4. **Database** — in Supabase SQL editor, apply [`supabase/schema.sql`](supabase/schema.sql); run incremental files under [`supabase/migrations/`](supabase/migrations/) as needed for existing DBs.

5. **Development**
   ```bash
   pnpm dev
   ```
   Opens the app at [http://localhost:3000](http://localhost:3000) (default Next.js port).

6. **Production build**
   ```bash
   pnpm build
   ```
   Equivalent: `pnpm --filter praxis run build` from the repo root.

## Project structure

```
<repo-root>/
  package.json                 # Delegates scripts to workspace package `praxis`
  patches/                     # Optional pnpm patch (see root package.json patchedDependencies)
  praxis/
    src/
      app/                     # Next.js App Router routes, layouts, API routes (`app/api/`)
      components/              # Shared UI — copilot, simulation, landing, tutorial, ui (shadcn)
      hooks/                   # Client hooks (copilot, AI edit)
      lib/                     # Supabase clients, OpenAI pipeline, Stripe, utilities
      proxy.ts                # Middleware-style session forwarding (Supabase SSR)
      types/                     # Generated / hand-maintained TS types (Supabase, library, data-blocks)
    supabase/
      schema.sql               # Canonical schema (+ RLS) for greenfield setups
      migrations/*.sql         # Incremental SQL for existing deployments
    public/                    # Static assets (images, logos)
    scripts/                   # Operational scripts (seed showcase library, bulk import helpers)
    docs/                       # Implementation notes & handoff (e.g. design token reference)
    .env.local.example         # Env template (committed)
```

Annotated index: **[`docs/CODEBASE_FILE_INDEX.md`](docs/CODEBASE_FILE_INDEX.md)** (tracked file counts and layout).

## Key architectural decisions

- **pnpm monorepo** — Root package managers resolve shared `node_modules` under `pnpm`’s `.pnpm`; [`next.config.ts`](next.config.ts) sets `outputFileTracingRoot` and `turbopack.root` so Next traces files from the repo root consistently.
- **Supabase SSR** — [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts), [`src/lib/supabase/middleware.ts`](src/lib/supabase/middleware.ts), and [`src/proxy.ts`](src/proxy.ts) cooperate for cookie/session refresh on protected routes.
- **AI generation** — Server routes stream simulation generation via SSE; pipeline splits outline + parallel constrained JSON sub-calls (`openai-pipeline.ts`) for reliability.
- **No global React Error Boundaries beyond route `error.tsx`** — route-level boundaries under `(auth)` and `(dashboard)` handle segment errors.

## Features

Organized by product area:

- **Landing & marketing** — Public landing page, FAQs, signup/login.
- **Dashboard** — List simulations; create/delete; filters; Stripe subscription entry (admin-gated pricing).
- **Create / edit** — AI generation from uploads (`/api/generate-simulation`), rich editor (`simulation-editor`), scenario images, preferences, publishing to library.
- **Library** — Public browse, favorites (“heart”), pinning (admin showcase).
- **Live session** — Session lobby QR/code, realtime participant updates, professor start/student play (`/join`, `/play/[code]`).
- **Reports & debrief** — Session outcomes, CSV-aligned reporting views, deterministic metrics where applicable.
- **Admin** — Feedback, analytics insight, emails, library pins (requires admin email / service role patterns per env).

## Environment variables

**Authoritative template:** [`praxis/.env.local.example`](./.env.local.example) — every variable referenced in runtime or scripts appears there with placeholders and brief comments (`NEXT_PUBLIC_*` for browser, secrets for server only).

**Never commit** real `.env`, `.env.local`, or `.env.*` with secrets — both root `.gitignore` and `praxis/.gitignore` exclude them while allowing `.env.local.example`.

## Deployment

- **Recommended:** [Vercel](https://vercel.com/) — set **Root Directory** to `praxis` if deploying from monorepo; copy env vars from [`.env.local.example`](./.env.local.example). [`vercel.json`](vercel.json) may pin framework hints.
- **Build:** CI (`.github/workflows/ci.yml`) runs `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build` with dummy `NEXT_PUBLIC_SUPABASE_*` for compile-time checks.

## Known issues / handoff notes

- Consolidated **`// HANDOFF NOTE`** topics: see [`docs/HANDOFF_DESIGN_TOKENS.md`](docs/HANDOFF_DESIGN_TOKENS.md) for design-token redundancy (hex in prose vs CSS utilities).
- **Mailing list** on landing footer: `// TODO [handoff]` in [`src/app/page.tsx`](src/app/page.tsx).
- **`src/lib/logger.ts`** — sanctioned single place invoking `console` for app diagnostics so feature code avoids raw `console.*`.
- **Images:** Logos on auth/join/dashboard shells and Supabase-hosted scenario art use **`next/image`**; [`next.config.ts`](next.config.ts) lists **`images.remotePatterns`** for `https://*.supabase.co/storage/v1/object/public/**`. **Blob/data** preview URLs in the simulation editor still render with **`<img>`** (one ESLint exception, documented in `simulation-editor.tsx`).

## Additional docs

- [Problem and Fix (Feature Expansion)](docs/PROBLEM_AND_FIX.md), [Implementation Status & Checklist](docs/IMPLEMENTATION_STATUS_AND_CHECKLIST.md), etc., under [`docs/`](docs/).
