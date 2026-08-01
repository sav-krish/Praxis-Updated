-- Persist onboarding state for signed-in students across browsers and sessions.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS student_skip_onboarding_globally BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS student_flow_settings JSONB;

CREATE TABLE IF NOT EXISTS public.student_simulation_onboarding (
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  student_onboarding_seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, simulation_id)
);

CREATE INDEX IF NOT EXISTS idx_student_simulation_onboarding_simulation
  ON public.student_simulation_onboarding(simulation_id);

ALTER TABLE public.student_simulation_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own onboarding state" ON public.student_simulation_onboarding;
CREATE POLICY "Students can view own onboarding state"
  ON public.student_simulation_onboarding FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own onboarding state" ON public.student_simulation_onboarding;
CREATE POLICY "Students can insert own onboarding state"
  ON public.student_simulation_onboarding FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own onboarding state" ON public.student_simulation_onboarding;
CREATE POLICY "Students can update own onboarding state"
  ON public.student_simulation_onboarding FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP TRIGGER IF EXISTS update_student_simulation_onboarding_updated_at
  ON public.student_simulation_onboarding;
CREATE TRIGGER update_student_simulation_onboarding_updated_at
  BEFORE UPDATE ON public.student_simulation_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
