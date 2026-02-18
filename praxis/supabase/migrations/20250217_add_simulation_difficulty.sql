-- Add simulation length / difficulty (easy, hard, challenge) with time estimates for students.
-- Run this migration if your simulations table was created from an earlier schema.

ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'hard', 'challenge')),
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR (estimated_minutes >= 5 AND estimated_minutes <= 120));

COMMENT ON COLUMN simulations.difficulty IS 'Simplified complexity: easy (~15 min), hard (~25 min), challenge (~40 min)';
COMMENT ON COLUMN simulations.estimated_minutes IS 'Estimated time for a student to complete the simulation (minutes).';
