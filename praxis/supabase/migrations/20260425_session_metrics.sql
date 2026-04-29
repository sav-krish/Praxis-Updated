-- Track 5c: pre-computed session aggregates + supporting indexes for the
-- new deterministic charts on /reports/[id].
--
-- The view stays intentionally lightweight: full chart metrics (option
-- distribution, time-to-decide, score histogram, optimal-pick rate) are
-- computed in application code from the indexed `responses` rows so we can
-- iterate on chart shapes without re-running migrations. The view exists so
-- the page header (participant count, response count, reflection count) is
-- one cheap query instead of three round-trips.

CREATE INDEX IF NOT EXISTS idx_responses_session_submitted
  ON responses (session_id, submitted_at);

-- partial index optimises the per-participant pivot used to score participants
-- and compute decision-time deltas.
CREATE INDEX IF NOT EXISTS idx_responses_session_participant_decision
  ON responses (session_id, participant_id, decision_id)
  WHERE participant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reflection_responses_session
  ON reflection_responses (session_id);

CREATE OR REPLACE VIEW session_metrics_v AS
SELECT
  s.id AS session_id,
  s.simulation_id,
  (SELECT count(*)::int FROM participants p WHERE p.session_id = s.id) AS participant_count,
  (SELECT count(*)::int FROM responses r WHERE r.session_id = s.id) AS response_count,
  (
    SELECT count(DISTINCT rr.participant_id)::int
    FROM reflection_responses rr
    WHERE rr.session_id = s.id AND rr.participant_id IS NOT NULL
  ) AS reflection_participant_count
FROM sessions s;

COMMENT ON VIEW session_metrics_v IS
  'Lightweight session aggregates; detailed chart metrics computed in application code.';
