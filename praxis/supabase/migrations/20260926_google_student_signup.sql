-- New Google accounts get student progress tracking. Existing accounts and
-- email/password role selection are unchanged; this trigger runs on INSERT only.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role TEXT := CASE
    WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'student'
    ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'professor')
  END;
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

