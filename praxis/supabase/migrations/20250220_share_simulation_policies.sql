-- Allow authenticated users to read any simulation (for share link / copy flow).
-- Share link is /share/[simulation_id]; only users with the link can read by id (UUID is unguessable).

CREATE POLICY "Authenticated can read any simulation" ON simulations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to read decisions, options, reflection_questions (needed to copy a shared simulation).

CREATE POLICY "Authenticated can read any decision" ON decisions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read any option" ON options
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can read any reflection_question" ON reflection_questions
  FOR SELECT USING (auth.role() = 'authenticated');
