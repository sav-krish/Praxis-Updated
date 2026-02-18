-- Backfill professor rows for existing auth.users who don't have a professor profile.
-- This handles users who signed up before the trigger was created or if the trigger failed.

INSERT INTO public.professors (id, email, name)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', NULL) as name
FROM auth.users au
LEFT JOIN public.professors p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
