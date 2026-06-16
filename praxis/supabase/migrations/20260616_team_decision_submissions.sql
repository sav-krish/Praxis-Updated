CREATE TABLE IF NOT EXISTS team_decision_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  submitted_by_participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, team_id, decision_id)
);

CREATE INDEX IF NOT EXISTS idx_team_decision_submissions_session
  ON team_decision_submissions (session_id);

CREATE INDEX IF NOT EXISTS idx_team_decision_submissions_team
  ON team_decision_submissions (team_id);

ALTER TABLE team_decision_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit team decision submissions" ON team_decision_submissions;
CREATE POLICY "Anyone can submit team decision submissions" ON team_decision_submissions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view team decision submissions" ON team_decision_submissions;
CREATE POLICY "Anyone can view team decision submissions" ON team_decision_submissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Professors can manage team decision submissions" ON team_decision_submissions;
CREATE POLICY "Professors can manage team decision submissions" ON team_decision_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM sessions s
      JOIN simulations sim ON sim.id = s.simulation_id
      WHERE s.id = team_decision_submissions.session_id
        AND sim.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM sessions s
      JOIN simulations sim ON sim.id = s.simulation_id
      WHERE s.id = team_decision_submissions.session_id
        AND sim.professor_id = auth.uid()
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE team_decision_submissions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
