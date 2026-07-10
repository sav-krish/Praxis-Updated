-- Student account and dashboard support.

CREATE TABLE IF NOT EXISTS public.student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  graduation_year INTEGER CHECK (
    graduation_year IS NULL OR (graduation_year >= 2000 AND graduation_year <= 2100)
  ),
  major TEXT,
  career_interests TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_participants_user ON public.participants(user_id);

CREATE TABLE IF NOT EXISTS public.student_simulation_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  assigned_by_professor_id UUID REFERENCES public.professors(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, simulation_id, assigned_by_professor_id)
);

CREATE INDEX IF NOT EXISTS idx_student_assignments_student
  ON public.student_simulation_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_assignments_simulation
  ON public.student_simulation_assignments(simulation_id);

CREATE TABLE IF NOT EXISTS public.student_simulation_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.student_simulation_assignments(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'explore' CHECK (source IN ('classroom', 'explore')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_attempts_student
  ON public.student_simulation_attempts(student_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_attempts_simulation
  ON public.student_simulation_attempts(simulation_id);
CREATE INDEX IF NOT EXISTS idx_student_attempts_session
  ON public.student_simulation_attempts(session_id);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_simulation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_simulation_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own student profile" ON public.student_profiles;
CREATE POLICY "Students can view own student profile"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own student profile" ON public.student_profiles;
CREATE POLICY "Students can insert own student profile"
  ON public.student_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own student profile" ON public.student_profiles;
CREATE POLICY "Students can update own student profile"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can view own assignments" ON public.student_simulation_assignments;
CREATE POLICY "Students can view own assignments"
  ON public.student_simulation_assignments FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Professors can manage own student assignments" ON public.student_simulation_assignments;
CREATE POLICY "Professors can manage own student assignments"
  ON public.student_simulation_assignments FOR ALL
  USING (auth.uid() = assigned_by_professor_id)
  WITH CHECK (auth.uid() = assigned_by_professor_id);

DROP POLICY IF EXISTS "Students can view own attempts" ON public.student_simulation_attempts;
CREATE POLICY "Students can view own attempts"
  ON public.student_simulation_attempts FOR SELECT
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own attempts" ON public.student_simulation_attempts;
CREATE POLICY "Students can insert own attempts"
  ON public.student_simulation_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own attempts" ON public.student_simulation_attempts;
CREATE POLICY "Students can update own attempts"
  ON public.student_simulation_attempts FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Professors can view attempts for own simulations" ON public.student_simulation_attempts;
CREATE POLICY "Professors can view attempts for own simulations"
  ON public.student_simulation_attempts FOR SELECT
  USING (
    simulation_id IN (
      SELECT id FROM public.simulations WHERE professor_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON public.student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_attempts_updated_at ON public.student_simulation_attempts;
CREATE TRIGGER update_student_attempts_updated_at
  BEFORE UPDATE ON public.student_simulation_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'professor');
  display_name TEXT := COALESCE(
    NEW.raw_user_meta_data->>'name',
    trim(concat_ws(' ', NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name'))
  );
BEGIN
  IF requested_role NOT IN ('professor', 'student') THEN
    requested_role := 'professor';
  END IF;

  INSERT INTO public.professors (id, email, name, active_role)
  VALUES (NEW.id, NEW.email, NULLIF(display_name, ''), requested_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.professors.name),
    active_role = EXCLUDED.active_role;

  IF requested_role = 'student' THEN
    INSERT INTO public.student_profiles (
      user_id,
      first_name,
      last_name,
      school,
      graduation_year,
      major,
      career_interests
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'school', ''),
      NULLIF(NEW.raw_user_meta_data->>'graduation_year', '')::INTEGER,
      NULLIF(NEW.raw_user_meta_data->>'major', ''),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text((NEW.raw_user_meta_data->'career_interests')::jsonb)),
        '{}'
      )
    )
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      school = EXCLUDED.school,
      graduation_year = EXCLUDED.graduation_year,
      major = EXCLUDED.major,
      career_interests = EXCLUDED.career_interests;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

