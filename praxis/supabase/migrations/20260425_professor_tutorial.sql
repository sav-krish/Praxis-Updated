-- Track 4a: persistence for the first-time interactive dashboard tutorial.
-- Records when a professor finished (or explicitly skipped) the tour so the
-- overlay never re-appears unless they pick "Replay tutorial" from the avatar
-- dropdown. NULL means the user has not completed the tour yet.

ALTER TABLE professors
  ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN professors.tutorial_completed_at IS
  'Timestamp the user finished or skipped the first-time dashboard tutorial. NULL = not yet seen.';
