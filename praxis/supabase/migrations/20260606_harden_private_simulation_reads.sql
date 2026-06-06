-- Tighten private simulation read access without changing Praxis user flows.
-- Public library reads continue through `is_public = true`.
-- Shared-copy flow now reads source simulations server-side via service role.

DROP POLICY IF EXISTS "Authenticated can read any simulation" ON simulations;
DROP POLICY IF EXISTS "Authenticated can read any decision" ON decisions;
DROP POLICY IF EXISTS "Authenticated can read any option" ON options;
DROP POLICY IF EXISTS "Authenticated can read any reflection_question" ON reflection_questions;

-- Keep response-video uploads tied to a real response row so arbitrary inserts
-- cannot attach media to unrelated sessions/participants.
DROP POLICY IF EXISTS "Anyone can insert response videos" ON response_videos;
CREATE POLICY "Anyone can insert response videos" ON response_videos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM responses r
      WHERE r.id = response_id
        AND r.session_id = response_videos.session_id
        AND r.decision_id = response_videos.decision_id
        AND r.option_id = response_videos.option_id
        AND r.participant_id = response_videos.participant_id
    )
  );
