-- Add is_admin to professors for admin feedback access
ALTER TABLE professors ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Admins can view all feedback (in addition to professors viewing their own)
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;
CREATE POLICY "Admins can view all feedback" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professors p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Admins can view all simulations (for feedback context)
DROP POLICY IF EXISTS "Admins can view all simulations" ON simulations;
CREATE POLICY "Admins can view all simulations" ON simulations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM professors p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );
