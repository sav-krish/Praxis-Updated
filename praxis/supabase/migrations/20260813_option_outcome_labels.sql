-- Preserve all existing score values while allowing the new "Good" outcome.
-- Existing values map directly: 3 = Perfect, 2 = Decent, 1 = Poor.
ALTER TABLE public.options
  ALTER COLUMN score TYPE NUMERIC(3,1) USING score::NUMERIC(3,1);

ALTER TABLE public.options
  DROP CONSTRAINT IF EXISTS options_score_check;

ALTER TABLE public.options
  ADD CONSTRAINT options_score_check CHECK (score IN (1, 2, 2.5, 3));
