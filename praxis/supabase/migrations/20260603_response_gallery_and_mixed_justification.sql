-- Expand justification modes and support unified response galleries.

ALTER TABLE simulations
  DROP CONSTRAINT IF EXISTS simulations_justification_type_check;

ALTER TABLE simulations
  ADD CONSTRAINT simulations_justification_type_check
  CHECK (justification_type IN ('written', 'video', 'video_or_text'));
