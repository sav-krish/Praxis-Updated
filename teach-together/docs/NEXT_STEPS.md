# Praxis — Next steps

Confirmed status and recommended order of work.

---

## Done (Version 1.1)

| Item | Status |
|------|--------|
| Blue color scheme (logo-derived palette) | Done — `globals.css`, README |
| Site name and logo → Praxis | Done — layout, dashboard, landing, favicon |
| Landing + app combined | Done — merge done; landing lives in `src/app/page.tsx` |
| Mobile-friendly (landing + app) | Done — responsive classes, touch targets |
| Data tables in cases | Done — Markdown + GFM tables in background content |
| Simulation length (Easy / Hard / Challenge + time) | Done — Run Settings, `estimated_minutes` |
| Personalized dashboard | Done — "Hello, {name}", course filter |
| User flow critique | Done — `docs/USER_FLOW_CRITIQUE.md` |
| `.gitignore` merge conflict | Resolved — merge can be committed |

---

## Recommended next steps (in order)

### 1. Finish the merge (if not already)

- From repo root: `git add .` (stage any remaining changes you want), then  
  `git commit -m "Merge website/main: landing page, resolve .gitignore"`.
- If the merge brought in a **second** Next.js app at repo root (`app/`, `next.config.js` there), decide: either remove that duplicate root app and keep everything under `teach-together/`, or document that the root app is legacy/optional.

### 2. Add the Profile page (P4)

- Dashboard header links to **Profile** (`/profile`) but the route does not exist → 404.
- **Next step:** Add `src/app/(dashboard)/profile/page.tsx` (or `(auth)` if you prefer). Show name, email, and optionally edit name; keep it simple so the link works.

### 3. High-impact user flow improvements (from USER_FLOW_CRITIQUE.md)

Implement in this order:

1. **After session end — "View report" CTA**  
   When the professor ends the session, show a clear “Session ended” state with one button: **View report** → link to the report for that run.

2. **Student waiting screen**  
   Change “Waiting for professor to start” to: **“You’re in. N students joined. Waiting for the instructor to start.”**

3. **Landing — instructor vs student**  
   Add a short line under the main CTAs: e.g. “Instructor? Sign up. Student? Use Join Session with your class code.” (or two clear buttons).

4. **Lobby — “X students waiting”**  
   Make “Start Simulation” prominent and add a line like “X students waiting. Start when ready.”

5. **Optional:** Post-first-generate checklist (“Review background, 3 decisions, reflection, run settings”); “Run again” from reports; large Continue button + est. time on student play (already partially there).

### 4. Share feature (P2 — “Cshare”)

- **Goal:** Let teachers share simulations with other teachers; recipients can modify (copy/fork).
- **Next step:** Design and implement:
  - **Share** button (e.g. on simulation card or editor).
  - Flow: generate shareable link or “Copy to my account” so another professor gets a copy of the simulation (new row in `simulations` with their `professor_id`). No need to change the original simulation schema unless you want “shared from” metadata.

### 5. Optional / later

- **Profile page** (see above) — do early so the header link works.
- **Branch name:** Plan mentions “Version 1.2” for the next branch; current branch is `Version-1.1`. Create `Version-1.2` when you start the next batch of features.
- **Deploy:** When ready, deploy (e.g. Vercel) and set Supabase redirect URLs to the production domain.

---

## Summary

- **Done:** Profile link removed; session-ended "View report" card; student waiting "You're in. N joined"; lobby "N students waiting. Start when ready." Share feature (dashboard + editor Share button, /share/[id], Copy to my account). Landing unchanged. Single app = `teach-together/`, landing at `src/app/page.tsx`.
- **Next:** Optional flow polish. Run migration `20250218_share_simulation_policies.sql` for share/copy to work.
