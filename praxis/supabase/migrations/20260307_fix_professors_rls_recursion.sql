-- Fix infinite recursion: "Admins can view all professors" policy queried professors
-- to check is_admin, which re-triggered the same policy. Remove it; "Professors can
-- view own profile" (auth.uid() = id) is sufficient for users to read their own row.
DROP POLICY IF EXISTS "Admins can view all professors" ON professors;
