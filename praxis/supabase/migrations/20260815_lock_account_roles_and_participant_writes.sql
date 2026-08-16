-- Account roles are chosen at signup and must not be switchable from the
-- client. Student profiles store preferences only; authorization always uses
-- the immutable account role so professor accounts can safely test sessions.
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

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.active_role IS DISTINCT FROM OLD.active_role
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Account role and admin access cannot be changed from the client';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_changes ON public.professors;
CREATE TRIGGER trg_prevent_profile_privilege_changes
  BEFORE UPDATE ON public.professors
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_changes();

CREATE OR REPLACE FUNCTION public.enforce_simulation_professor_account()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF NOT public.is_professor_account(auth.uid()) THEN
    RAISE EXCEPTION 'Student accounts cannot create or edit simulations';
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.professor_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You do not own this simulation';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.professor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You do not own this simulation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_simulation_professor_account ON public.simulations;
CREATE TRIGGER trg_enforce_simulation_professor_account
  BEFORE INSERT OR UPDATE OR DELETE ON public.simulations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_simulation_professor_account();

-- Keep anonymous guest play intact while binding authenticated responses to
-- their own participant record. Preview owners may act as their preview
-- participant, including previews created before `participants.user_id`.
CREATE OR REPLACE FUNCTION public.can_act_as_participant(
  target_participant_id UUID,
  target_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  participant_user_id UUID;
  session_is_preview BOOLEAN;
  simulation_owner_id UUID;
BEGIN
  SELECT p.user_id, s.is_preview, sim.professor_id
  INTO participant_user_id, session_is_preview, simulation_owner_id
  FROM public.participants p
  JOIN public.sessions s ON s.id = p.session_id
  JOIN public.simulations sim ON sim.id = s.simulation_id
  WHERE p.id = target_participant_id
    AND p.session_id = target_session_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN participant_user_id IS NULL;
  END IF;

  RETURN participant_user_id = auth.uid()
    OR (
      session_is_preview = TRUE
      AND simulation_owner_id = auth.uid()
      AND public.is_professor_account(auth.uid())
    );
END;
$$;

-- Browser clients never need to create or mutate arbitrary participant rows.
-- Classroom joins and student starts use validated server routes; professor
-- preview/lobby controls retain access to participants in their own sessions.
DROP POLICY IF EXISTS "Anyone can insert participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can update participants" ON public.participants;
DROP POLICY IF EXISTS "Professors can manage own session participants" ON public.participants;
CREATE POLICY "Professors can manage own session participants"
  ON public.participants
  FOR ALL
  TO authenticated
  USING (
    public.is_professor_account(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.simulations sim ON sim.id = s.simulation_id
      WHERE s.id = participants.session_id
        AND sim.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_professor_account(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.simulations sim ON sim.id = s.simulation_id
      WHERE s.id = participants.session_id
        AND sim.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can submit responses" ON public.responses;
CREATE POLICY "Participants can submit responses"
  ON public.responses
  FOR INSERT
  WITH CHECK (public.can_act_as_participant(participant_id, session_id));

DROP POLICY IF EXISTS "Anyone can submit reflection responses" ON public.reflection_responses;
CREATE POLICY "Participants can submit reflection responses"
  ON public.reflection_responses
  FOR INSERT
  WITH CHECK (public.can_act_as_participant(participant_id, session_id));

DROP POLICY IF EXISTS "Anyone can submit team decision submissions" ON public.team_decision_submissions;
CREATE POLICY "Participants can submit team decision submissions"
  ON public.team_decision_submissions
  FOR INSERT
  WITH CHECK (
    public.can_act_as_participant(submitted_by_participant_id, session_id)
    AND EXISTS (
      SELECT 1
      FROM public.teams t
      WHERE t.id = team_decision_submissions.team_id
        AND t.session_id = team_decision_submissions.session_id
    )
  );

DROP POLICY IF EXISTS "Anyone can insert response videos" ON public.response_videos;
CREATE POLICY "Participants can insert response videos"
  ON public.response_videos
  FOR INSERT
  WITH CHECK (
    public.can_act_as_participant(participant_id, session_id)
    AND EXISTS (
      SELECT 1
      FROM public.responses r
      WHERE r.id = response_videos.response_id
        AND r.session_id = response_videos.session_id
        AND r.decision_id = response_videos.decision_id
        AND r.option_id = response_videos.option_id
        AND r.participant_id = response_videos.participant_id
    )
  );
