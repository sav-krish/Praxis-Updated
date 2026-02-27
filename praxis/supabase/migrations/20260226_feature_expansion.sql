-- Feature Expansion Migration
-- Covers: Feedback, Preferences, Library (favorites), Profile (role switching),
-- Knowledge Base (RAG), and Facilitator Debrief

-- ============================================================
-- 1. FEEDBACK TABLE
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_feedback_simulation ON feedback(simulation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id);

-- ============================================================
-- 2. PREFERENCES COLUMN ON SIMULATIONS
-- ============================================================
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- ============================================================
-- 3. SIMULATION LIBRARY (is_public, favorites)
-- ============================================================
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS simulation_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_simulation_favorites_simulation ON simulation_favorites(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_favorites_user ON simulation_favorites(user_id);

-- Trigger function to keep favorite_count in sync
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

-- ============================================================
-- 4. PROFILE: active_role on professors
-- ============================================================
ALTER TABLE professors ADD COLUMN IF NOT EXISTS active_role TEXT DEFAULT 'professor' CHECK (active_role IN ('professor', 'student'));

-- ============================================================
-- 5. KNOWLEDGE BASE (RAG) — pgvector + chunks table
-- ============================================================
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

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_subject ON knowledge_chunks(subject);

-- RPC function for vector similarity search
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

-- ============================================================
-- 6. FACILITATOR DEBRIEF
-- ============================================================
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS debrief_guide JSONB;

-- ============================================================
-- 7. HIDDEN PROFILES (ASYMMETRIC INFORMATION)
-- ============================================================
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS hidden_profiles_enabled BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS simulation_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  private_briefing TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, order_num)
);

CREATE INDEX IF NOT EXISTS idx_simulation_profiles_simulation ON simulation_profiles(simulation_id);

ALTER TABLE participants ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES simulation_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_participants_profile ON participants(profile_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on new tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY '{feedback,simulation_favorites,knowledge_chunks,simulation_profiles}'::TEXT[]
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

-- Enable realtime for feedback
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
