# Praxis Feature Expansion: Problems and Fixes

This document summarizes the **user-reported problems** and the **fixes and new features** implemented in the Praxis feature expansion (plan reference: Praxis Feature Expansion Plan).

---

## 1. Problems (User Feedback)

### 1.1 Student stuck on refresh / never saw simulation

**Feedback:** *"I struggled a bit with the user experience once I created a simulation and tried to join it as a student, I got stuck on the refresh page and never got to see my simulation come to life."*

**Root cause:** The student play page relied on Supabase Realtime to detect when the session moved from lobby to running. If Realtime failed (tab in background, network hiccup, free-tier limits), the student stayed on the waiting screen. Polling existed but was 3s-only and only in lobby; a refresh after the professor had already started could leave the client in a bad state.

---

### 1.2 AI took creative liberty; scenario went off-track

**Feedback:** *"I originally had prompted it to create something from the Vanatin case around utilitarian and ethical frameworks, but the report seems like it was going to have them make decisions about a marketing campaign... I feel like the AI took some creative liberty to focus on that angle (when I didn't prompt it to do so)."*

**Root cause:** The AI system prompt encouraged “engaging” simulations but did not constrain the model to stay within the professor’s intended framing or source material.

---

### 1.3 Camouflage / reframe not respected

**Feedback:** *"I asked the tool to create the Challenger disaster case but camouflage it to make it about racing instead. The only material I loaded was the Wikipedia page on the challenger disaster case. Perhaps the word 'camouflage' threw the tool off because the background content it produced was still about a NASA launch, not about racing."*

**Root cause:** There was no explicit “reframe/disguise as” input; the model was not instructed to translate the scenario into an alternate setting while keeping the same dilemmas.

---

### 1.4 Missing debrief / instructor insights

**Feedback:** *"Perhaps a missing piece was offering some insights for helping the instructor de-brief participants on what the 'correct' course of action was etc. (might have missed it but didn't see it)."*

**Root cause:** Reports showed distributions and scores but did not provide a facilitator guide (correct path, discussion points, common mistakes, connection to objectives).

---

### 1.5 Hidden profiles / asymmetric information (future ask)

**Feedback:** *"Since we have a lot of 'hidden profile' cases, it would be cool to have an option or setting to allow for participants to have unique or different sets of information."*

**Status:** Not implemented in this round; captured as a future feature (see fixes below).

---

## 2. Fixes and New Features Implemented

### 2.1 Lobby / play stuck (student never sees simulation)

**Fix (in `src/app/play/[code]/page.tsx`):**

- **Faster polling in lobby:** Poll session status every **2s** (was 3s) while on the waiting screen.
- **Polling during play:** When not in lobby, poll every **5s** so session completion is still detected if Realtime misses it.
- **Manual “Refresh status” button:** On the waiting screen, students can tap “Refresh status” to re-fetch session status and jump to background or results if the session has already started or ended.
- **No change to Realtime:** Realtime subscription is unchanged; polling and the button act as fallbacks.

**Result:** Students are no longer stuck on the refresh/waiting page when Realtime fails or they join after the professor has started.

---

### 2.2 AI creative liberty and camouflage

**Fixes:**

1. **“Stay close to source material” toggle (create page + `openai.ts`)**  
   When ON, the system prompt adds: *"You MUST base ALL decisions, scenarios, background content, and details strictly on the provided source materials. Do NOT introduce new angles, topics, creative interpretations, or details not present in the source."*

2. **“Reframe / Disguise scenario as” field (create page + API + `openai.ts`)**  
   New optional text field, e.g. *"A racing team deciding on tire changes"*. The prompt explicitly instructs the model to **disguise/reframe** the scenario in that setting while preserving the same dilemmas and learning objectives (fixes the Challenger → racing case).

3. **RAG knowledge base (optional grounding)**  
   When the RAG pipeline is used, retrieved chunks are injected as “Reference Materials” so the model has factual grounding and is less likely to invent angles (e.g. Vanatin staying on ethical frameworks instead of drifting to marketing).

**Result:** Professors can constrain the AI to source material and/or request a clear reframe (e.g. NASA → racing); RAG further improves fidelity when knowledge-base content exists.

---

### 2.3 Facilitator debrief / instructor insights

**Fix:**

- **“Debrief” tab on reports page** (`/reports/[id]`): New tab with a “Generate Facilitator Guide” button.
- **API `POST /api/generate-debrief`:** Uses GPT to produce a structured guide from the simulation and (optionally) session context.
- **Stored in DB:** Guide is saved in `sessions.debrief_guide` (JSONB) so it is reused for that session.
- **Guide contents:** Correct course of action and reasoning, key discussion points, common student mistakes and how to address them, connection to learning objectives, facilitator tips.

**Result:** Instructors get explicit debrief support and “correct” course of action without having to infer it from the report alone.

---

### 2.4 Editor flow (progress bar + top nav)

**Problem (from plan):** Circular left/right buttons and step logos were distracting; mobile had prev/next at the bottom of each step.

**Fix (in `src/app/(dashboard)/edit/[id]/simulation-editor.tsx`):**

- Replaced circular side buttons with a **top bar:** “Previous” and “Next” text buttons with step label “Step X of 4: {Name}” in the center.
- Added a **horizontal progress bar** showing completion (e.g. 25%, 50%, 75%, 100%).
- Removed all **bottom mobile nav** blocks from each step; one top bar is used on desktop and mobile.
- Kept the **clickable step breadcrumbs** (Background → Decisions → Reflection → Settings) above the progress bar.

**Result:** Single, clear step-by-step flow with progress bar and top prev/next on all devices.

---

### 2.5 Simulation Library (browse, share, favorites)

**New behavior:**

- **`/library` page:** Two zones:
  - **“Top Simulations”:** Horizontal row of simulations ranked by `favorite_count` (most favorited first).
  - **“Browse All”:** Grid with search (title/topic), subject filter, and difficulty filter.
- **Share to Library:** In the editor **Settings** step, a “Publish to Simulation Library” toggle sets `simulations.is_public`. Default OFF (opt-in).
- **Favorites:** Heart on each library card; stored in `simulation_favorites`; `favorite_count` on `simulations` kept in sync by DB trigger.
- **Schema:** `simulations.is_public`, `simulations.favorite_count`, table `simulation_favorites`, RLS for public read and user-scoped favorites.

**Result:** Professors and students can browse and search by subject; professors opt-in to sharing; favorited simulations rise to “Top Simulations.”

---

### 2.6 Feedback (post-generation and post-session)

**New behavior:**

- **Schema:** Table `feedback` with `simulation_id`, `session_id` (optional), `user_id`/`participant_id`, `feedback_type` (`post_generation` | `post_session`), `role` (professor | student), `checked_items` (text[]), `freeform_text`.
- **Post-generation feedback:** After AI generates a simulation, the edit page can show a dismissible banner: “How was the generated simulation?” with predefined checkboxes (e.g. “Decisions were relevant to my topic”, “It took creative liberties I didn’t want”) plus “Anything else?” freeform.
- **Post-session feedback:**  
  - **Student:** On the results/complete screen, a card “How was your experience?” with checkboxes and freeform.  
  - **Professor:** In the reports Debrief tab, same pattern: “How did the simulation perform in class?” with checkboxes and freeform.

**Result:** Low-friction feedback at two moments (after generation, after session) for both roles, stored in one table.

---

### 2.7 Professor preferences (multi-select)

**New behavior:**

- **Create page:** “Preferences” section with multi-select tags in four categories: Simulation Style, Student Interaction, Content Focus, Assessment Style (e.g. Case Study, Role Play, Data-Driven, Nuanced Tradeoffs).
- **Storage:** Selected preferences saved in `simulations.preferences` (JSONB).
- **AI:** Preferences passed into the generation API and injected into the system prompt so the model tailors the simulation (e.g. more data-driven, debate-focused).

**Result:** Teachers can steer the kind of simulation (style, interaction, focus, assessment) without writing long instructions.

---

### 2.8 Profile and professor/student mode

**New behavior:**

- **`/profile` page:** User can set display name and switch **Viewing mode** between “Professor” and “Student.”
- **Storage:** `professors.active_role` (`professor` | `student`).
- **Dashboard/layout:** When in Student mode, “New Simulation” is hidden and the dashboard can emphasize Library and “Join Simulation”; when in Professor mode, behavior is unchanged.

**Result:** One account can switch context between creating/running simulations and browsing/joining as a student.

---

### 2.9 RAG / knowledge base (optional grounding)

**New behavior:**

- **Schema:** `knowledge_chunks` table (subject, source_filename, chunk_index, content, embedding vector). Optional `match_knowledge_chunks` RPC for similarity search.
- **Ingestion:** API route (e.g. `POST /api/ingest-knowledge`) accepts files + subject; text is extracted, chunked, embedded with OpenAI, and stored. (Supabase Storage bucket can hold the raw files; ingestion can be run when you add new PDFs.)
- **Generation:** When generating a simulation, the API can call `retrieveRelevantChunks` (e.g. by course topic + goal), then inject the top chunks into the prompt as “Reference Materials from Praxis Knowledge Base.”
- **Libraries:** `src/lib/knowledge-base.ts` (chunking, embed, retrieve, format for prompt).

**Result:** Simulations can be grounded in pre-uploaded business/case materials; professors without their own file still get better, source-anchored output when the knowledge base is populated. **RAG does not make generation faster;** it adds a small latency (embed + search) but improves accuracy and supports “no upload” premade simulations.

---

### 2.10 Hidden profiles / asymmetric information

**Status:** Not implemented. A “Coming soon” note was added in the editor **Settings** step (e.g. “Asymmetric information (hidden profiles) — coming soon”) to acknowledge the request. Full support would require participant-specific content variants and editor UI to define them (planned for a later version).

---

## 3. Schema and migration summary

Applied via migration(s) and/or `schema.sql`:

- **feedback** — post-generation and post-session feedback.
- **simulations** — `preferences` (JSONB), `is_public`, `favorite_count`.
- **simulation_favorites** — user–simulation favorites; trigger updates `favorite_count`.
- **professors** — `active_role` (`professor` | `student`).
- **sessions** — `debrief_guide` (JSONB).
- **knowledge_chunks** — RAG (subject, content, embedding, etc.); optional `match_knowledge_chunks` for vector search.

RLS and Realtime were updated as needed for the new tables and columns.

---

## 4. Quick reference: where things live

| Area              | Main files / routes |
|-------------------|---------------------|
| Play stuck fix    | `src/app/play/[code]/page.tsx` |
| AI constraints    | `src/app/(dashboard)/create/page.tsx`, `src/lib/openai.ts`, `src/app/api/generate-simulation/route.ts` |
| Debrief guide     | `src/app/(dashboard)/reports/[id]/reports-view.tsx`, `src/app/api/generate-debrief/route.ts` |
| Editor progress    | `src/app/(dashboard)/edit/[id]/simulation-editor.tsx` |
| Library           | `src/app/(dashboard)/library/page.tsx`, `library-view.tsx`; editor Settings step (Share to Library) |
| Feedback          | `src/components/simulation/FeedbackCard.tsx`; editor, play results, reports Debrief tab |
| Preferences       | `src/app/(dashboard)/create/page.tsx`, `src/lib/openai.ts` |
| Profile / role    | `src/app/(dashboard)/profile/page.tsx`, `profile-form.tsx`; dashboard layout |
| RAG               | `src/lib/knowledge-base.ts`, `src/app/api/ingest-knowledge/route.ts`, generate-simulation route |

---

*This README reflects the state of the codebase after the feature expansion; for the original product overview and setup, see [README.md](../README.md).*
