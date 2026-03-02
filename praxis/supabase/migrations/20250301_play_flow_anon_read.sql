-- Allow anonymous users (students) to read simulations, decisions, options, and reflection
-- questions when that content is linked to a session. Required for the play flow (join by code).
-- Uses SECURITY DEFINER to avoid policy recursion (sessions policy references simulations).

CREATE OR REPLACE FUNCTION public.simulation_ids_with_sessions()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT simulation_id FROM public.sessions;
$$;

-- Simulations: allow anon to read simulations that have a session
CREATE POLICY "Anon can read simulations with sessions" ON simulations
  FOR SELECT USING (
    id IN (SELECT simulation_ids_with_sessions())
  );

-- Decisions: allow anon to read decisions for simulations with sessions
CREATE POLICY "Anon can read decisions for play" ON decisions
  FOR SELECT USING (
    simulation_id IN (SELECT simulation_ids_with_sessions())
  );

-- Options: allow anon to read options for decisions in simulations with sessions
CREATE POLICY "Anon can read options for play" ON options
  FOR SELECT USING (
    decision_id IN (
      SELECT d.id FROM decisions d
      WHERE d.simulation_id IN (SELECT simulation_ids_with_sessions())
    )
  );

-- Reflection questions: allow anon to read for simulations with sessions
CREATE POLICY "Anon can read reflection questions for play" ON reflection_questions
  FOR SELECT USING (
    simulation_id IN (SELECT simulation_ids_with_sessions())
  );
