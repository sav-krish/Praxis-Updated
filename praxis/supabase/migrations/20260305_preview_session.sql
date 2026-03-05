-- Add is_preview to sessions for professor preview flow
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_preview BOOLEAN DEFAULT false;
