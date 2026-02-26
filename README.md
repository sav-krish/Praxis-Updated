# Praxis

Interactive decision-based classroom simulations for higher education.

## Quick Start (for collaborators)

```bash
# Clone the repo, then from the project root:
pnpm install    # Installs dependencies (includes praxis app - runs automatically)
pnpm dev       # Starts the dev server at http://localhost:3000
```

**Important:** Run `pnpm install` from the **project root** (not inside `praxis/`). The `postinstall` script installs the praxis app dependencies including Tailwind CSS. If you see "cannot resolve tailwindcss", you likely skipped this step—run `pnpm install` at the root.

## Project structure

- `praxis/` — The Next.js app (all app code lives here)
- Root `package.json` — Thin wrapper that delegates scripts to `praxis/`

See [praxis/README.md](praxis/README.md) for detailed setup (env vars, Supabase, database, deployment).
