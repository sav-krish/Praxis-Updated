-- Reduce student/professor data exposure while preserving existing Praxis UX.
-- Student play content is now served through a server-side API route, so the
-- broad anonymous/global read policies can be removed.

DROP POLICY IF EXISTS "Anon can read simulations with sessions" ON simulations;
DROP POLICY IF EXISTS "Anon can read decisions for play" ON decisions;
DROP POLICY IF EXISTS "Anon can read options for play" ON options;
DROP POLICY IF EXISTS "Anon can read reflection questions for play" ON reflection_questions;

DROP POLICY IF EXISTS "Anyone can read simulation profiles" ON simulation_profiles;
DROP POLICY IF EXISTS "Anyone can read data blocks" ON simulation_data_blocks;
