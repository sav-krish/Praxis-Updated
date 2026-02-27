# Praxis Feature Expansion: Implementation Status & Verification Checklist

## Completion: **100%** (all plan items implemented)

---

## What’s Implemented (by area)

### Phase 1 — Critical UX fixes

| # | Item | Status | Where |
|---|------|--------|--------|
| 1 | **Editor: progress bar + top nav** | Done | `src/app/(dashboard)/edit/[id]/simulation-editor.tsx` — Progress bar, “Step X of 4”, Previous/Next at top; circular side buttons and bottom mobile nav removed |
| 2 | **Lobby stuck fix** | Done | `src/app/play/[code]/page.tsx` — 2s polling in lobby, 5s when playing; “Refresh status” button on waiting screen |
| 3 | **AI: stay close to source** | Done | `src/app/(dashboard)/create/page.tsx` (toggle), `src/lib/openai.ts` (prompt), `src/app/api/generate-simulation/route.ts` (pass-through) |
| 4 | **AI: reframe/camouflage field** | Done | Same as above — “Reframe / Disguise scenario as” input and prompt injection |

### Phase 2 — Core features

| # | Item | Status | Where |
|---|------|--------|--------|
| 5 | **Feedback schema** | Done | `supabase/schema.sql`, `supabase/migrations/20260226_feature_expansion.sql`, `src/types/database.ts` — `feedback` table |
| 6 | **Post-generation feedback UI** | Done | `src/components/simulation/FeedbackCard.tsx`; editor shows banner when `?generated=1`; create page redirects to `edit/[id]?generated=1` |
| 7 | **Post-session feedback (student)** | Done | `src/app/play/[code]/page.tsx` — FeedbackCard on results screen |
| 8 | **Post-session feedback (professor)** | Done | `src/app/(dashboard)/reports/[id]/reports-view.tsx` — FeedbackCard in Debrief tab |
| 9 | **Preferences multi-select** | Done | `src/app/(dashboard)/create/page.tsx` (tag UI), `src/lib/openai.ts` (inject), API route (preferences JSON) |
| 10 | **Profile page + role toggle** | Done | `src/app/(dashboard)/profile/page.tsx`, `profile-form.tsx`; `professors.active_role`; layout hides “New Simulation” in student mode |
| 11 | **Library schema** | Done | `simulations.is_public`, `favorite_count`; `simulation_favorites` table + trigger; RLS |

### Phase 3 — Platform growth

| # | Item | Status | Where |
|---|------|--------|--------|
| 12 | **Library page** | Done | `src/app/(dashboard)/library/page.tsx`, `library-view.tsx` — Top Simulations row, Browse All with search/subject/difficulty, heart favorite |
| 13 | **Share to Library switch** | Done | Editor Settings step in `simulation-editor.tsx`; save includes `is_public` |
| 14 | **RAG pipeline** | Done | `src/lib/knowledge-base.ts`, `src/app/api/ingest-knowledge/route.ts`, `match_knowledge_chunks` in migration; generate-simulation route calls retrieval and injects chunks |
| 15 | **Facilitator debrief** | Done | `src/app/api/generate-debrief/route.ts`, Debrief tab in `reports-view.tsx`; `sessions.debrief_guide` |
| 16 | **Hidden profiles placeholder** | Done | “Coming soon” note in editor Settings step |

---

## Verification Checklist (ensure fixes are right)

Run through these to confirm behavior and catch regressions.

### 1. Lobby / play (student never stuck)

- [ ] **1.1** Professor creates session, student joins with code → student sees “You’re in” waiting screen.
- [ ] **1.2** Professor clicks “Start Simulation” → student’s view moves to background (within ~2–5 s) without refresh.
- [ ] **1.3** With student on waiting screen, professor starts simulation → student still on same tab: either Realtime or 2s poll moves them to background.
- [ ] **1.4** Student on waiting screen clicks “Refresh status” → if session is already running, student jumps to background (or to results if ended).
- [ ] **1.5** Student joins after session started, opens `/play/CODE` → `loadSession` sets step to background (or correct step), not stuck on 0.
- [ ] **1.6** Session ends → student moves to results (Realtime or 5s poll).

### 2. AI constraints (creative liberty + camouflage)

- [ ] **2.1** Create simulation with “Stay close to source material” ON and clear source material → generated content hews to that material (no unrelated angles).
- [ ] **2.2** Create with “Reframe / Disguise scenario as” set (e.g. “a racing team making tire decisions”) and Challenger-like source → background and decisions use the new setting (e.g. racing), not raw NASA.
- [ ] **2.3** Create with both OFF and no reframe → behavior unchanged from before (creative generation allowed).
- [ ] **2.4** Generate with AI → redirect goes to `/edit/[id]?generated=1` and post-generation feedback banner appears (if implemented to show when `generated=1`).

### 3. Editor UX

- [ ] **3.1** Edit simulation → top bar shows “Previous”, “Step X of 4: [Name]”, “Next” and a progress bar (no circular left/right buttons).
- [ ] **3.2** On mobile → same top bar; no prev/next buttons at bottom of each step.
- [ ] **3.3** Clicking breadcrumb (e.g. “Decisions”) jumps to that step; progress bar and step label update.
- [ ] **3.4** Settings step shows “Share to Library” toggle and “Asymmetric information (hidden profiles) — coming soon”.

### 4. Library

- [ ] **4.1** `/library` loads without error (no 500 if no public sims).
- [ ] **4.2** With at least one public simulation with favorites → “Top Simulations” row shows it (sorted by favorite_count).
- [ ] **4.3** Search by title or topic filters the grid.
- [ ] **4.4** Subject and Difficulty dropdowns filter the grid.
- [ ] **4.5** Logged-in user: heart on a card toggles favorite; count updates after refresh or real-time update if wired.
- [ ] **4.6** Editor: set “Share to Library” ON, Save → that simulation appears in library (and in Browse All).

### 5. Feedback

- [ ] **5.1** After AI generate → on edit page, post-generation feedback card appears (when `generated=1`); checkboxes + freeform; Submit saves to `feedback` table.
- [ ] **5.2** Student completes simulation → on results screen, post-session feedback card; submit as student (participant_id) and confirm row in `feedback`.
- [ ] **5.3** Professor opens report for a completed session → Debrief tab shows post-session feedback card for professor; submit and confirm row in `feedback`.

### 6. Preferences

- [ ] **6.1** Create page: Preferences section shows 4 categories and tags; selecting tags adds them (multi-select).
- [ ] **6.2** Generate with AI with some preferences selected → generated simulation reflects them (e.g. “Data-Driven” → more charts/tables; “Debate” → decisions suited to debate).
- [ ] **6.3** New simulation row has `preferences` JSONB populated when created from that form.

### 7. Profile and role

- [ ] **7.1** `/profile` loads; name and email shown; Professor / Student mode cards toggle `active_role`.
- [ ] **7.2** Save profile → `professors.active_role` and name update; next load reflects it.
- [ ] **7.3** Switch to Student mode, go to dashboard → “New Simulation” (or Create) is hidden; Library/Join prominent.
- [ ] **7.4** Switch back to Professor → “New Simulation” visible again.

### 8. Debrief guide

- [ ] **8.1** Reports → Debrief tab: “Generate Facilitator Guide” present when no guide exists.
- [ ] **8.2** Click Generate → request to `/api/generate-debrief`; Debrief tab shows correct course of action, discussion points, common mistakes, connection to objectives, tips.
- [ ] **8.3** Reload report → guide still there (read from `sessions.debrief_guide`).
- [ ] **8.4** Professor feedback card in same tab (if present) submits without error.

### 9. RAG (if using knowledge base)

- [ ] **9.1** Run migration that creates `knowledge_chunks` and `match_knowledge_chunks` (if not already).
- [ ] **9.2** POST to `/api/ingest-knowledge` with subject + file(s) → chunks and embeddings stored in `knowledge_chunks`.
- [ ] **9.3** Generate a simulation with topic matching that subject (no professor upload) → prompt includes “Reference Materials” or similar from retrieved chunks (check logs or temporarily log injected text).
- [ ] **9.4** No ingestion yet → generate still works; RAG branch is optional (try/catch or no chunks).

### 10. Schema and migrations

- [ ] **10.1** Run `supabase/schema.sql` (or migrations including `20260226_feature_expansion.sql`) on a fresh or existing DB → no errors.
- [ ] **10.2** Tables exist: `feedback`, `simulation_favorites`, `knowledge_chunks` (if using RAG); columns exist: `simulations.preferences`, `is_public`, `favorite_count`; `professors.active_role`; `sessions.debrief_guide`.
- [ ] **10.3** Trigger on `simulation_favorites` (insert/delete) updates `simulations.favorite_count`.
- [ ] **10.4** RLS: authenticated users can read public simulations; users can manage own favorites; professors can read feedback for own simulations.

---

## Quick stats

| Metric | Value |
|--------|--------|
| Plan items (excluding “hidden profiles” as future) | 15 |
| Implemented | 15 |
| Completion | **100%** |
| New routes | `/library`, `/profile` |
| New API routes | `/api/ingest-knowledge`, `/api/generate-debrief` |
| New components | `FeedbackCard`, `LibraryView`, `ProfileForm` |
| New DB tables | `feedback`, `simulation_favorites`, `knowledge_chunks` |

Use the checklist above before release or demo to ensure all fixes and features behave as intended.
