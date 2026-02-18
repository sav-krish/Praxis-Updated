

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Professors table (linked to Supabase Auth)
CREATE TABLE professors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulations table
CREATE TABLE simulations (
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions table (3 per simulation)
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL CHECK (order_num BETWEEN 1 AND 3),
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, order_num)
);

-- Options table (3 per decision: A, B, C)
CREATE TABLE options (
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
CREATE TABLE reflection_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL CHECK (order_num BETWEEN 1 AND 2),
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, order_num)
);

-- Data blocks for simulations (tables, charts, timelines, etc.)
CREATE TABLE simulation_data_blocks (
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
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  join_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'running', 'complete')),
  current_step INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table (for team mode)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table (students in a session)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_voter BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responses table (decision submissions)
CREATE TABLE responses (
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
CREATE TABLE reflection_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES reflection_questions(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (participant_id IS NOT NULL OR team_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_simulations_professor ON simulations(professor_id);
CREATE INDEX idx_decisions_simulation ON decisions(simulation_id);
CREATE INDEX idx_options_decision ON options(decision_id);
CREATE INDEX idx_sessions_simulation ON sessions(simulation_id);
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_team ON participants(team_id);
CREATE INDEX idx_responses_session ON responses(session_id);
CREATE INDEX idx_responses_decision ON responses(decision_id);
CREATE INDEX idx_simulation_data_blocks_simulation ON simulation_data_blocks(simulation_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_data_blocks ENABLE ROW LEVEL SECURITY;

-- Professors can only see/edit their own profile
CREATE POLICY "Professors can view own profile" ON professors
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Professors can update own profile" ON professors
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Professors can insert own profile" ON professors
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Professors can only see/edit their own simulations
CREATE POLICY "Professors can view own simulations" ON simulations
  FOR SELECT USING (professor_id = auth.uid());

CREATE POLICY "Professors can insert own simulations" ON simulations
  FOR INSERT WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Professors can update own simulations" ON simulations
  FOR UPDATE USING (professor_id = auth.uid());

CREATE POLICY "Professors can delete own simulations" ON simulations
  FOR DELETE USING (professor_id = auth.uid());

-- Decisions inherit access from simulations
CREATE POLICY "Access decisions via simulation" ON decisions
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

-- Options inherit access from decisions
CREATE POLICY "Access options via decision" ON options
  FOR ALL USING (
    decision_id IN (
      SELECT d.id FROM decisions d
      JOIN simulations s ON d.simulation_id = s.id
      WHERE s.professor_id = auth.uid()
    )
  );

-- Reflection questions inherit access from simulations
CREATE POLICY "Access reflection questions via simulation" ON reflection_questions
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

-- Data blocks: professors manage, anyone can read (for student view)
CREATE POLICY "Access data blocks via simulation" ON simulation_data_blocks
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

CREATE POLICY "Anyone can read data blocks" ON simulation_data_blocks
  FOR SELECT USING (true);

-- Sessions: professors can manage, anyone can read with join code
CREATE POLICY "Professors can manage own sessions" ON sessions
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

CREATE POLICY "Anyone can read sessions by join code" ON sessions
  FOR SELECT USING (true);

-- Teams: professors can manage, participants can view
CREATE POLICY "Professors can manage teams" ON teams
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN simulations sim ON s.simulation_id = sim.id
      WHERE sim.professor_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view teams" ON teams
  FOR SELECT USING (true);

-- Participants: anyone can join (no auth required for students)
CREATE POLICY "Anyone can view participants" ON participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert participants" ON participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update participants" ON participants
  FOR UPDATE USING (true);

-- Responses: anyone can submit and view
CREATE POLICY "Anyone can submit responses" ON responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view responses" ON responses
  FOR SELECT USING (true);

-- Reflection responses: anyone can submit and view
CREATE POLICY "Anyone can submit reflection responses" ON reflection_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view reflection responses" ON reflection_responses
  FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for simulations updated_at
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
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Enable realtime for sessions and participants
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
