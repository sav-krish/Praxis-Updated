-- Keep the first decision response.
CREATE UNIQUE INDEX IF NOT EXISTS responses_one_per_participant_decision_session
  ON responses (participant_id, decision_id, session_id);
