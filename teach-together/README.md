# Teach Together

Interactive decision-based classroom simulations for higher education. Professors create scenarios with branching decision points; students join live sessions, make choices, see consequences, and reflect on their experience.

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
cd teach-together
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
```

### 3. Set up the database

In your Supabase SQL editor, run the contents of `supabase/schema.sql`. This creates all tables, indexes, RLS policies, triggers, and enables Realtime on the necessary tables.

**Important:** Make sure Realtime is enabled for the `sessions`, `participants`, `teams`, and `responses` tables. The schema file does this automatically, but you can verify in your Supabase dashboard under **Database > Replication**.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/teach-together.git
git push -u origin main
```

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set the **Root Directory** to `teach-together` (if the repo root contains the parent folder)
4. Add the following **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
5. Click **Deploy**

Vercel auto-detects Next.js and handles the build. Each push to `main` triggers a new deployment.

### 3. Configure Supabase for production

In your Supabase project settings:

- **Authentication > URL Configuration**: Add your Vercel deployment URL (e.g., `https://teach-together.vercel.app`) as a **Site URL** and to **Redirect URLs**.
- **Authentication > Email Templates**: Customize the confirmation email if desired.
- Ensure your RLS policies are in place (the schema file handles this).

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
