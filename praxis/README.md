# Praxis (Teach Together)

**Praxis** is the product name for this app. Interactive decision-based classroom simulations for higher education.

## Website palette (Praxis logo–derived)

The app and landing page use a blue palette derived from the Praxis logo for consistency:

| Role | Hex | Usage |
|------|-----|--------|
| **Primary (accent)** | `#1D4ED8` | Primary buttons, links, key CTAs |
| **Primary dark** | `#0F2447` (ink) | Headings, body text |
| **Canvas** | `#F3F7FF` | Page background (landing) |
| **Accent soft** | `#E5EEFF` | Secondary backgrounds, hover states |
| **Line** | `#D6E1F2` | Borders, dividers |
| **Muted text** | `#516481` | Secondary text, captions |
| **Logo primary** | `#5BA2D8` | Logo primary blue (book/arrows) |
| **Logo light** | `#AADBF4` – `#AED6EB` | Logo highlights |

These values are defined in `src/app/globals.css` (theme and `[data-landing="true"]` overrides) and used across the landing page and app UI. Professors create scenarios with branching decision points; students join live sessions, make choices, see consequences, and reflect on their experience.

## Features

- **AI-powered simulation generation** -- Upload course materials and let GPT-4o create a complete scenario with decisions, consequences, and reflection questions.
- **Manual authoring** -- Full editor to write or tweak every decision prompt, option, description, consequence, and score.
- **Live classroom sessions** -- Students join via a 6-character code or QR scan. No student accounts required.
- **Real-time updates** -- Professor sees participants join and submit responses in real time; students see session start instantly.
- **Individual & team modes** -- Run simulations where each student responds individually, or in auto-assigned / self-organized teams.
- **Reports & CSV export** -- View decision distributions, score breakdowns, and reflection responses. Export everything to CSV.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS 4, shadcn/ui (Radix primitives) |
| Database | Supabase (PostgreSQL, Auth, Realtime) |
| AI | OpenAI GPT-4o |
| Deployment | Vercel (recommended) |

## Prerequisites

- **Node.js 18+** and npm
- A **Supabase** project (free tier works)
- An **OpenAI API key** (for AI generation -- optional if you only author manually)

## Local Development

### 1. Clone & install

```bash
cd praxis
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
# Optional: OPENAI_MODEL=gpt-4o  (default is gpt-4o-mini for higher TPM / longer materials)
```

**Long materials and rate limits:** The app defaults to `gpt-4o-mini` (200k TPM) so long uploads usually don’t need truncation. Set `OPENAI_MODEL=gpt-4o` to use the stronger model (30k TPM on tier 1; materials are truncated if very long). For unbounded length, the pattern used by tools like Google NotebookLM is **chunking + RAG**—you could add that later for full books or huge note sets.

### 3. Set up the database

In your Supabase SQL editor, run the contents of `supabase/schema.sql`. This creates all tables, indexes, RLS policies, triggers, and enables Realtime on the necessary tables.

If you have an existing database from an earlier schema:

- Run `supabase/migrations/20250217_add_simulation_difficulty.sql` to add simulation length/difficulty (easy, hard, challenge) and time estimates.
- Run `supabase/migrations/20250218_share_simulation_policies.sql` to allow the share/copy flow (authenticated users can read simulations for copying).
- Run `supabase/migrations/20250218_backfill_professors.sql` to create professor rows for existing users who don't have one (fixes foreign key errors when creating simulations).
- Run `supabase/migrations/20250218_simulation_data_blocks.sql` to add data blocks (tables, charts, timelines). Safe if table already exists (uses `IF NOT EXISTS`).
- Run `supabase/migrations/20250218_matrix_to_pie_chart.sql` if you had the old matrix block type — replaces it with pie_chart.

**Important:** Make sure Realtime is enabled for the `sessions`, `participants`, `teams`, and `responses` tables. The schema file does this automatically, but you can verify in your Supabase dashboard under **Database > Replication**.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

### 1. Push to GitHub

```bash
cd praxis
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/teach-together.git
git push -u origin main
```

If the app lives in a subfolder (e.g. `praxis/` inside the repo), push from the repo root and configure the Root Directory in Vercel.

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set the **Root Directory** to `praxis` if the app is in that subfolder
4. Add these **Environment Variables** (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – your Supabase anon key
   - `OPENAI_API_KEY` – your OpenAI API key (required for AI generation)
   - `OPENAI_MODEL` – optional, default is `gpt-4o-mini`
5. Click **Deploy**

Vercel detects Next.js from `vercel.json` and builds automatically. Each push to `main` triggers a new deployment.

### 3. Configure Supabase for production

In your Supabase project settings:

- **Authentication > URL Configuration**: Add your Vercel deployment URL (e.g., `https://praxis.vercel.app`) as a **Site URL** and to **Redirect URLs**.
- **Authentication > Email Templates**: Customize the confirmation email if desired.
- Ensure your RLS policies are in place (the schema file handles this).

## Docs

- **[Problem and Fix (Feature Expansion)](docs/PROBLEM_AND_FIX.md)** — User-reported issues (stuck on refresh, AI creative liberty, camouflage, missing debrief) and the fixes and new features (library, feedback, preferences, profile, RAG, facilitator guide).
- **[Implementation Status & Verification Checklist](docs/IMPLEMENTATION_STATUS_AND_CHECKLIST.md)** — What’s implemented, completion %, and a checklist to verify all fixes and features work correctly.

## Project Structure

```
src/
  app/
    (auth)/           # Login & signup pages
    (dashboard)/      # Professor dashboard, editor, session lobby, reports
    api/              # AI generation endpoint
    join/             # Student join page (no auth required)
    play/             # Student play page (no auth required)
  components/ui/      # shadcn/ui components
  lib/
    openai.ts         # AI content generation
    file-parser.ts    # PDF/DOCX text extraction
    supabase/         # Supabase client (browser, server, middleware)
  types/
    database.ts       # TypeScript types from Supabase schema
supabase/
  schema.sql          # Complete database schema
```

## Flow

1. **Professor** signs up, creates a simulation (AI or manual), and edits it.
2. **Professor** starts a live session from the editor or dashboard.
3. **Students** enter the 6-character join code at `/join`.
4. **Professor** clicks "Start Simulation" -- students automatically move to the background scenario.
5. **Students** read the background, make 3 decisions, then answer reflection questions.
6. **Professor** ends the session and views reports with distributions, scores, and reflections.

## License

Private project.
