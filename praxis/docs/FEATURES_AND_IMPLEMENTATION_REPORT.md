# Praxis: Features and Implementation Report

**Product:** Praxis (Teach Together) — Interactive decision-based classroom simulations for higher education.

**Last updated:** March 2025

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Authentication & User Model](#authentication--user-model)
3. [Simulation Creation](#simulation-creation)
4. [Simulation Editor](#simulation-editor)
5. [Live Classroom Sessions](#live-classroom-sessions)
6. [Student Experience (Join & Play)](#student-experience-join--play)
7. [Reports & Analytics](#reports--analytics)
8. [Library & Sharing](#library--sharing)
9. [Admin Features](#admin-features)
10. [Pricing & Subscriptions](#pricing--subscriptions)
11. [Database Schema Overview](#database-schema-overview)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Styling | Tailwind CSS 4, shadcn/ui (Radix primitives) |
| Database | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| AI | OpenAI GPT-4o / GPT-4o-mini |
| Email | Resend |
| Payments | Stripe |
| Deployment | Vercel (recommended) |

---

## Authentication & User Model

### Implementation

- **Supabase Auth** for sign-up, login, and session management.
- **Professors table** linked to `auth.users` via `id` (FK with ON DELETE CASCADE).
- **Trigger:** `handle_new_user` creates a `professors` row on signup with `id`, `email`, and `name` from `raw_user_meta_data`.
- **Active role:** `professor` or `student` (toggle in profile).
- **Admin:** `is_admin` boolean on professors; `ADMIN_EMAILS` env var (comma-separated) grants admin without DB change.

### Key Files

- `src/lib/supabase/client.ts` — Browser client (anon/publishable key).
- `src/lib/supabase/server.ts` — Server client + `createServiceRoleClient()` for admin operations.
- `src/lib/supabase/middleware.ts` — Session refresh.
- `src/lib/admin.ts` — `isAdmin(user)` checks `ADMIN_EMAILS` or `professors.is_admin`; excludes students.

### RLS

- Professors can SELECT/UPDATE/INSERT only their own row.
- No "admins view all professors" policy (avoids recursion); admin email API uses service role.

---

## Simulation Creation

### AI-Powered Generation

**Flow:** Professor uploads materials (PDF, DOCX, TXT) and/or pastes text → API extracts text → optionally enriches with RAG → GPT-4o generates simulation structure.

**Implementation:**

1. **File upload & storage**
   - Files uploaded to Supabase Storage bucket `simulation-uploads`.
   - Path: `{user_id}/{upload_id}/{sanitized_filename}`.
   - Allowed MIME: PDF, DOCX, DOC, TXT.
   - Paths stored in `simulation_uploaded_files` when simulation is saved.

2. **Text extraction**
   - `src/lib/file-parser.ts`: `unpdf` for PDF, `mammoth` for DOCX, `Buffer.toString` for TXT.
   - `extractTextFromFiles(files)` returns concatenated text with `--- Content from {name} ---` headers.

3. **RAG (optional)**
   - `src/lib/knowledge-base.ts`: chunks text, embeds with `text-embedding-3-small`, stores in `knowledge_chunks` (pgvector).
   - `retrieveRelevantChunks()` uses `match_knowledge_chunks` RPC for cosine similarity.
   - Chunks formatted and appended to prompt when available.

4. **Generation**
   - `src/lib/openai.ts`: `generateSimulationContent()` builds system + user prompt.
   - Difficulty: easy (~15 min), hard (~25 min), challenge (~40 min).
   - Options: `stayCloseToSource`, `reframeAs`, `preferences`.
   - Output: `GeneratedSimulation` with `backgroundContent`, `dataBlocks`, `decisions` (3 × 3 options), `reflectionQuestions` (2).

5. **API route**
   - `POST /api/generate-simulation`: FormData with `title`, `courseTopic`, `difficulty`, `goal`, `targetDecisions`, `pastedText`, `aiNotes`, `files`, etc.
   - Truncates materials by TPM (gpt-4o: 70k chars, gpt-4o-mini: 280k).
   - Returns `{ success, simulation, uploadedFilePaths }`.

6. **Save to DB**
   - `create/page.tsx`: `saveGeneratedSimulation(generated, uploadedFilePaths)` inserts simulation, decisions, options, reflection questions, data blocks, and links uploaded files.

### Manual Authoring

- Professor can create a simulation from scratch or edit an AI-generated one.
- Full editor for background, decisions, options, consequences, scores, reflection questions, data blocks, and profiles.

---

## Simulation Editor

### Implementation

- **Route:** `(dashboard)/edit/[id]/`.
- **Components:** `SimulationEditor` orchestrates tabs/sections; `DataBlockEditor`, `DataBlockRenderer`, `FeedbackCard`.
- **Data blocks:** table, bar_chart, line_chart, kpi_cards, timeline, pie_chart — stored as JSONB in `simulation_data_blocks`.
- **Profiles:** `simulation_profiles` for hidden/asymmetric info (profile_name, private_briefing).
- **Preferences:** JSONB on simulations (e.g. difficulty, mode, team settings).
- **Auto-save:** Debounced updates to Supabase.

### Preview as Student

- `PreviewSimulationButton` calls `createPreviewSession(simulationId)`.
- Creates a session with `is_preview: true`, status `running`, and a professor participant.
- Opens `/play/{joinCode}` in new tab with participant ID in URL; responses are not persisted for preview sessions.

---

## Live Classroom Sessions

### Session Lifecycle

1. **Create session:** Professor clicks "Start Session" from editor or dashboard.
2. **Lobby:** 6-character join code (e.g. `ABC123`), QR code, participant list.
3. **Start:** Professor clicks "Start Simulation" → `current_step` set to 1; students see background.
4. **Running:** Professor advances steps (0 = waiting, 1 = background, 2–4 = decisions, 5 = reflection, 6 = results).
5. **Complete:** Professor ends session.

### Implementation

- **Tables:** `sessions`, `participants`, `teams`, `responses`, `reflection_responses`.
- **Join code:** 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous chars).
- **Realtime:** Supabase Realtime on `sessions`, `participants`, `teams`, `responses` for live updates.
- **Professor preview:** On "Start Simulation", `createProfessorPreviewParticipant(sessionId)` creates a participant and opens play URL with `participantId` and `participantName` in query params.

### Modes

- **Individual:** Each participant submits their own responses.
- **Teams:** Auto-assigned or self-organized; `teams` table; team-level responses.

---

## Student Experience (Join & Play)

### Join Flow

- **Route:** `/join`.
- Student enters 6-character code; session lookup when code is complete.
- If already joined (sessionStorage), redirects to `/play/{code}`.
- On submit: insert `participants` row, store `participant_id` and `participant_name` in sessionStorage, redirect to play.

### Play Flow

- **Route:** `/play/[code]`.
- Loads session, simulation, decisions, options, reflection questions, data blocks.
- **Steps:** 0 (waiting), 1 (background), 2–4 (decisions), 5 (reflection), 6 (results).
- **Realtime:** Subscribes to `current_step` and participant count.
- **Hidden profiles:** If enabled, participant gets a random `simulation_profile`; `private_briefing` shown as extra context.
- **Preview sessions:** `is_preview` sessions skip persisting responses/reflections to DB.
- **URL params:** `participantId` and `participantName` from professor preview flow; stored in sessionStorage and URL cleaned.

### Data Block Rendering

- `DataBlockRenderer` renders table, bar_chart, line_chart, kpi_cards, timeline, pie_chart using Recharts and custom markup.

---

## Reports & Analytics

### Implementation

- **Route:** `(dashboard)/reports/[id]`.
- **Data:** Fetches simulation, sessions, selected session, decisions, participants, teams, responses, reflection responses.
- **Views:**
  - Decision distributions (option counts, percentages).
  - Score breakdown (1–3 per option).
  - Reflection responses by question.
  - CSV export of responses and reflections.
- **Debrief guide:** AI-generated via `POST /api/generate-debrief`; stores in `sessions.debrief_guide` JSONB.

### Feedback

- `FeedbackCard` for post-generation and post-session feedback.
- Types: `post_generation`, `post_session`; roles: `professor`, `student`.
- Checkbox items + freeform text; stored in `feedback` table.

---

## Library & Sharing

### Library

- **Route:** `(dashboard)/library`.
- Lists public simulations (`is_public = true`) with search, filters, favorites.
- **Favorites:** `simulation_favorites`; trigger keeps `favorite_count` on simulations in sync.
- **Use simulation:** `copySimulationToAccount(simulationId)` copies simulation, decisions, options, reflection questions, data blocks, profiles to current user.

### Share

- **Route:** `(dashboard)/share/[id]`.
- Share link; authenticated users can copy simulation to their account via `copySimulationToAccount`.

### RLS

- Public simulations: `SELECT` where `is_public = true`.
- Share/copy: authenticated users can read simulations they have access to (own, public, or admin).

---

## Admin Features

### Admin Access

- `ADMIN_EMAILS` env var or `professors.is_admin = true`.
- Students are never admins.

### Admin – Feedback

- **Route:** `(dashboard)/admin/feedback`.
- Lists all feedback (uses service role or admin RLS) with filters.
- RLS: `Admins can view all feedback`.

### Admin – Emails

- **Route:** `(dashboard)/admin/emails`.
- **Recipients:** `GET /api/admin/emails/recipients` — service role fetches all professors (bypasses RLS).
- **Send:** `POST /api/admin/emails/send` — sends to selected recipients via Resend.
- **Send test:** `POST /api/admin/emails/send-test` — single test email.
- **Resend:** `src/lib/email/resend-service.ts` — `sendAdminEmail()`, `sendCustomEmail()`; stub mode when `RESEND_API_KEY` unset.

### Admin – Pricing

- Pricing page and Stripe checkout are admin-only.
- Non-admins redirected to dashboard.

---

## Pricing & Subscriptions

### Implementation

- **Stripe:** `src/lib/stripe/server.ts` — `getStripe()`, `getAppUrl()`.
- **Create checkout:** `POST /api/stripe/create-checkout` — admin-only; creates Stripe Checkout session (subscription mode); returns `session.url`; client redirects.
- **Webhook:** `POST /api/stripe/webhook` — verifies signature; handles `checkout.session.completed`, `customer.subscription.*`; upserts `subscriptions` table.
- **Tables:** `subscriptions` (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan_name, status, current_period_start/end, etc.).
- **Success page:** `(dashboard)/subscription/success` — shows confirmation after redirect.

### Env Vars

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.

---

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `professors` | User profiles; linked to auth.users; active_role, is_admin |
| `simulations` | Core simulation metadata; mode, difficulty, preferences, is_public |
| `simulation_profiles` | Hidden profiles / asymmetric info |
| `decisions` | 3 per simulation |
| `options` | 3 per decision (A, B, C); score 1–3 |
| `reflection_questions` | 2 per simulation |
| `simulation_data_blocks` | Tables, charts, timelines, etc. |
| `simulation_uploaded_files` | Links to storage paths for create materials |
| `sessions` | Live sessions; join_code, status, current_step, is_preview |
| `teams` | For team mode |
| `participants` | Students in session; optional profile_id, team_id |
| `responses` | Decision submissions |
| `reflection_responses` | Reflection answers |
| `feedback` | Post-generation and post-session feedback |
| `simulation_favorites` | User favorites for library ranking |
| `knowledge_chunks` | RAG chunks with pgvector embeddings |
| `subscriptions` | Stripe subscription records |

### Key Functions

- `match_knowledge_chunks(query_embedding, match_count, filter_subject)` — vector similarity search.
- `generate_join_code()` — 6-char code.
- `handle_new_user()` — create professor on signup.
- `update_simulation_favorite_count()` — trigger to sync favorite_count.

### Storage

- **simulation-uploads:** PDF, DOCX, TXT uploaded during creation; paths in `simulation_uploaded_files`.

---

## Monorepo & Build

- **Root:** `praxis/` is the Next.js app; pnpm workspace.
- **Turbopack:** `next.config.ts` sets `turbopack.root` and `outputFileTracingRoot` to workspace root so pnpm store is resolvable.
- **Scripts:** `pnpm dev`, `pnpm build` (webpack), `pnpm start`.

---

## Environment Variables Summary

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` | Admin operations |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | AI generation |
| `RESEND_API_KEY`, `RESEND_FROM` | Email (Resend) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` | Stripe |
| `NEXT_PUBLIC_APP_URL` | App URL for redirects |
