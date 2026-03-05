-- Admins can view all professors (for email campaigns, etc.)
-- NOTE: This policy caused infinite recursion; removed in 20260307_fix_professors_rls_recursion.sql
DROP POLICY IF EXISTS "Admins can view all professors" ON professors;
CREATE POLICY "Admins can view all professors" ON professors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM professors p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
