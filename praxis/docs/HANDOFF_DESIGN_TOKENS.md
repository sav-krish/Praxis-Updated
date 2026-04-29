# Design tokens & styles (reference — Phase 5 audit)

Read-only consolidation for handoff. **Do not treat this file as runtime source**; theme values live in code as noted below.

## Where tokens are defined

| Source | Contents |
|--------|----------|
| [`src/app/globals.css`](../src/app/globals.css) | `@import "tailwindcss"`, `@theme inline { ... }` mapping CSS vars to Tailwind semantics; `:root` and `.dark`; landing palette (`--color-canvas`, `--color-ink`, `--color-accentSoft`, `--color-line`, `--color-muted-text`, etc.); Geist-linked font tokens |
| Tailwind `@theme inline` | Maps `--color-*`, `--radius-*`, sidebar/chart semantic colors to utility classes |

## Typography

- **Families**: [`Geist` / `Geist_Mono`](../src/app/layout.tsx) loaded via `next/font/google`; CSS variables `--font-geist-sans`, `--font-geist-mono` on `<body>`.

## Colors duplicated in prose vs CSS

Palette table in README lists marketing hex (`#1D4ED8` accent). **Semantic app colors** primarily use `:root` HSL-derived tokens (`--primary`, `--background`, …) and `@theme inline` bridging. Repeated hex literals also appear directly in JSX (e.g. inline styles in email HTML, brand tables). **HANDOFF NOTE:** refactor opportunities are documentation-only unless a future pass standardizes hex without altering visible output.

## Global stylesheet entry

[`src/app/globals.css`](../src/app/globals.css) — imported once from [`src/app/layout.tsx`](../src/app/layout.tsx).

## Regression check after hygiene PRs

No intentional CSS/class/tailwind changes were made during Phases 1–3 of the production readiness pass; validate with visual smoke tests if further edits occur.
