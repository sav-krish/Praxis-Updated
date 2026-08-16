-- `student_profiles` stores student-specific preferences, not authorization.
-- A professor can join or test a session and may already have a profile row,
-- so role checks must use the immutable signup role instead.
CREATE OR REPLACE FUNCTION public.is_professor_account(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.professors p
    WHERE p.id = target_user_id
      AND p.active_role = 'professor'
  );
$$;
