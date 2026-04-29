# Tracked codebase file index

Generated from `git ls-files` at repo root — single inventory for Phases 1 & 6 handoff.

- **183** tracked paths spanning:
  - **Root**: `.github/workflows/ci.yml`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `README.md`
  - **Application** (`praxis/`): Next.js App Router (`src/app/`), API routes (`src/app/api/`),
    shared components (`src/components/`), hooks (`src/hooks/`),
    libs (`src/lib/` including Supabase/OpenAI/email), types (`src/types/`),
    `proxy.ts`, `globals.css`
  - **Supabase**: `supabase/schema.sql`, `supabase/migrations/*.sql`
  - **Static assets**: `public/*`
  - **Scripts**: `scripts/delete-showcase-library.mjs`, `scripts/seed-showcase-library.mjs`
  - **Docs**: `docs/*.md` — includes `FEATURE_IMPLEMENTATION_GUIDE.md`, handoff/design notes, historical product reports
  - **Config**: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vercel.json`, `components.json`, `postcss.config.mjs`
  - **Patches** (workspace root reference): workspace `pnpm.patchedDependencies` may reference `patches/` at monorepo root (see root `package.json`)

Re-run locally: `git ls-files` — add new commits before regenerating after large changes.
