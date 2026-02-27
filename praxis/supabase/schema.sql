-- Schema: idempotent — safe to re-run on existing databases.
-- Uses IF NOT EXISTS / DROP IF EXISTS where applicable.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Professors table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  active_role TEXT DEFAULT 'professor' CHECK (active_role IN ('professor', 'student')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulations table
CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  course_topic TEXT DEFAULT 'Power & Influence',
  goal TEXT,
  target_decisions TEXT,
  background_content TEXT,
  ai_notes TEXT,
  mode TEXT DEFAULT 'individual' CHECK (mode IN ('individual', 'teams')),
  team_size INTEGER,
  team_assignment TEXT CHECK (team_assignment IN ('auto', 'self')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'hard', 'challenge')),
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR (estimated_minutes >= 5 AND estimated_minutes <= 120)),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  preferences JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  favorite_count INTEGER DEFAULT 0,
  hidden_profiles_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulation profiles (hidden profiles / asymmetric information)
CREATE TABLE IF NOT EXISTS simulation_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  private_briefing TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, order_num)
);

-- Decisions table (3 per simulation)
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL CHECK (order_num BETWEEN 1 AND 3),
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, order_num)
);

-- Options table (3 per decision: A, B, C)
CREATE TABLE IF NOT EXISTS options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (label IN ('A', 'B', 'C')),
  title TEXT NOT NULL,
  description TEXT,
  consequence TEXT,
  score INTEGER DEFAULT 1 CHECK (score BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(decision_id, label)
);

-- Reflection questions table (2 per simulation)
CREATE TABLE IF NOT EXISTS reflection_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL CHECK (order_num BETWEEN 1 AND 2),
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, order_num)
);

-- Data blocks for simulations (tables, charts, timelines, etc.)
CREATE TABLE IF NOT EXISTS simulation_data_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('table', 'bar_chart', 'line_chart', 'kpi_cards', 'timeline', 'pie_chart')),
  title TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, order_num)
);

-- Sessions table (live classroom sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  join_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'running', 'complete')),
  current_step INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  debrief_guide JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table (for team mode)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table (students in a session)
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_voter BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add profile_id to participants (safe for both fresh and existing databases)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES simulation_profiles(id) ON DELETE SET NULL;

-- Responses table (decision submissions)
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  justification TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (participant_id IS NOT NULL OR team_id IS NOT NULL)
);

-- Reflection responses table
CREATE TABLE IF NOT EXISTS reflection_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES reflection_questions(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (participant_id IS NOT NULL OR team_id IS NOT NULL)
);

-- Feedback table (post-generation and post-session)
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('post_generation', 'post_session')),
  role TEXT NOT NULL CHECK (role IN ('professor', 'student')),
  checked_items TEXT[] NOT NULL DEFAULT '{}',
  freeform_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulation favorites (for library ranking)
CREATE TABLE IF NOT EXISTS simulation_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, user_id)
);

-- Knowledge base chunks (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulations_professor ON simulations(professor_id);
CREATE INDEX IF NOT EXISTS idx_decisions_simulation ON decisions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_options_decision ON options(decision_id);
CREATE INDEX IF NOT EXISTS idx_sessions_simulation ON sessions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id);
CREATE INDEX IF NOT EXISTS idx_responses_session ON responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_decision ON responses(decision_id);
CREATE INDEX IF NOT EXISTS idx_simulation_data_blocks_simulation ON simulation_data_blocks(simulation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_simulation ON feedback(simulation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_simulation_favorites_simulation ON simulation_favorites(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_favorites_user ON simulation_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_subject ON knowledge_chunks(subject);
CREATE INDEX IF NOT EXISTS idx_simulation_profiles_simulation ON simulation_profiles(simulation_id);
CREATE INDEX IF NOT EXISTS idx_participants_profile ON participants(profile_id);

-- RPC for RAG: vector similarity search over knowledge_chunks
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 8,
  filter_subject text DEFAULT NULL
)
RETURNS TABLE (
  content text,
  subject text,
  source_filename text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.content,
    kc.subject,
    kc.source_filename,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    kc.embedding IS NOT NULL
    AND (filter_subject IS NULL OR kc.subject = filter_subject)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables (idempotent: only enable if not already)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY '{professors,simulations,decisions,options,reflection_questions,sessions,teams,participants,responses,reflection_responses,simulation_data_blocks,feedback,simulation_favorites,knowledge_chunks,simulation_profiles}'::TEXT[]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = tbl AND n.nspname = 'public' AND NOT c.relrowsecurity
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;

-- Professors can only see/edit their own profile
DROP POLICY IF EXISTS "Professors can view own profile" ON professors;
CREATE POLICY "Professors can view own profile" ON professors
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Professors can update own profile" ON professors;
CREATE POLICY "Professors can update own profile" ON professors
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Professors can insert own profile" ON professors;
CREATE POLICY "Professors can insert own profile" ON professors
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Professors can only see/edit their own simulations
DROP POLICY IF EXISTS "Professors can view own simulations" ON simulations;
CREATE POLICY "Professors can view own simulations" ON simulations
  FOR SELECT USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professors can insert own simulations" ON simulations;
CREATE POLICY "Professors can insert own simulations" ON simulations
  FOR INSERT WITH CHECK (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professors can update own simulations" ON simulations;
CREATE POLICY "Professors can update own simulations" ON simulations
  FOR UPDATE USING (professor_id = auth.uid());

DROP POLICY IF EXISTS "Professors can delete own simulations" ON simulations;
CREATE POLICY "Professors can delete own simulations" ON simulations
  FOR DELETE USING (professor_id = auth.uid());

-- Decisions inherit access from simulations
DROP POLICY IF EXISTS "Access decisions via simulation" ON decisions;
CREATE POLICY "Access decisions via simulation" ON decisions
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

-- Options inherit access from decisions
DROP POLICY IF EXISTS "Access options via decision" ON options;
CREATE POLICY "Access options via decision" ON options
  FOR ALL USING (
    decision_id IN (
      SELECT d.id FROM decisions d
      JOIN simulations s ON d.simulation_id = s.id
      WHERE s.professor_id = auth.uid()
    )
  );

-- Reflection questions inherit access from simulations
DROP POLICY IF EXISTS "Access reflection questions via simulation" ON reflection_questions;
CREATE POLICY "Access reflection questions via simulation" ON reflection_questions
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

-- Data blocks: professors manage, anyone can read (for student view)
DROP POLICY IF EXISTS "Access data blocks via simulation" ON simulation_data_blocks;
CREATE POLICY "Access data blocks via simulation" ON simulation_data_blocks
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can read data blocks" ON simulation_data_blocks;
CREATE POLICY "Anyone can read data blocks" ON simulation_data_blocks
  FOR SELECT USING (true);

-- Sessions: professors can manage, anyone can read with join code
DROP POLICY IF EXISTS "Professors can manage own sessions" ON sessions;
CREATE POLICY "Professors can manage own sessions" ON sessions
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can read sessions by join code" ON sessions;
CREATE POLICY "Anyone can read sessions by join code" ON sessions
  FOR SELECT USING (true);

-- Teams: professors can manage, participants can view
DROP POLICY IF EXISTS "Professors can manage teams" ON teams;
CREATE POLICY "Professors can manage teams" ON teams
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN simulations sim ON s.simulation_id = sim.id
      WHERE sim.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view teams" ON teams;
CREATE POLICY "Anyone can view teams" ON teams
  FOR SELECT USING (true);

-- Participants: anyone can join (no auth required for students)
DROP POLICY IF EXISTS "Anyone can view participants" ON participants;
CREATE POLICY "Anyone can view participants" ON participants
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert participants" ON participants;
CREATE POLICY "Anyone can insert participants" ON participants
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update participants" ON participants;
CREATE POLICY "Anyone can update participants" ON participants
  FOR UPDATE USING (true);

-- Responses: anyone can submit and view
DROP POLICY IF EXISTS "Anyone can submit responses" ON responses;
CREATE POLICY "Anyone can submit responses" ON responses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view responses" ON responses;
CREATE POLICY "Anyone can view responses" ON responses
  FOR SELECT USING (true);

-- Reflection responses: anyone can submit and view
DROP POLICY IF EXISTS "Anyone can submit reflection responses" ON reflection_responses;
CREATE POLICY "Anyone can submit reflection responses" ON reflection_responses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view reflection responses" ON reflection_responses;
CREATE POLICY "Anyone can view reflection responses" ON reflection_responses
  FOR SELECT USING (true);

-- Feedback: anyone can submit, professors can read their own
DROP POLICY IF EXISTS "Anyone can submit feedback" ON feedback;
CREATE POLICY "Anyone can submit feedback" ON feedback
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Professors can view feedback for own simulations" ON feedback;
CREATE POLICY "Professors can view feedback for own simulations" ON feedback
  FOR SELECT USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

-- Simulation favorites: authenticated users can manage their own
DROP POLICY IF EXISTS "Users can manage own favorites" ON simulation_favorites;
CREATE POLICY "Users can manage own favorites" ON simulation_favorites
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read favorites" ON simulation_favorites;
CREATE POLICY "Anyone can read favorites" ON simulation_favorites
  FOR SELECT USING (true);

-- Public simulations: anyone authenticated can read
DROP POLICY IF EXISTS "Anyone can read public simulations" ON simulations;
CREATE POLICY "Anyone can read public simulations" ON simulations
  FOR SELECT USING (is_public = true);

-- Knowledge chunks: read for all, insert for authenticated users
DROP POLICY IF EXISTS "Anyone can read knowledge chunks" ON knowledge_chunks;
CREATE POLICY "Anyone can read knowledge chunks" ON knowledge_chunks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert knowledge chunks" ON knowledge_chunks;
CREATE POLICY "Authenticated users can insert knowledge chunks" ON knowledge_chunks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Simulation profiles: professors can CRUD for their own simulations, anyone can read
DROP POLICY IF EXISTS "Anyone can read simulation profiles" ON simulation_profiles;
CREATE POLICY "Anyone can read simulation profiles" ON simulation_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professors can manage own simulation profiles" ON simulation_profiles;
CREATE POLICY "Professors can manage own simulation profiles" ON simulation_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM simulations s WHERE s.id = simulation_id AND s.professor_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for simulations updated_at
DROP TRIGGER IF EXISTS update_simulations_updated_at ON simulations;
CREATE TRIGGER update_simulations_updated_at
  BEFORE UPDATE ON simulations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate random join code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a professor profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.professors (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create professor profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Enable realtime for sessions and participants (idempotent: add only if not already in publication)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
EXCEPTION WHEN OTHERS THEN NULL; -- Already in publication or other non-fatal error
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE teams;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE responses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Trigger to keep favorite_count in sync
CREATE OR REPLACE FUNCTION update_simulation_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE simulations SET favorite_count = favorite_count + 1 WHERE id = NEW.simulation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE simulations SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = OLD.simulation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_favorite_count_insert ON simulation_favorites;
CREATE TRIGGER trg_favorite_count_insert
  AFTER INSERT ON simulation_favorites
  FOR EACH ROW EXECUTE FUNCTION update_simulation_favorite_count();

DROP TRIGGER IF EXISTS trg_favorite_count_delete ON simulation_favorites;
CREATE TRIGGER trg_favorite_count_delete
  AFTER DELETE ON simulation_favorites
  FOR EACH ROW EXECUTE FUNCTION update_simulation_favorite_count();
