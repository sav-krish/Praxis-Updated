ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS response_gallery_access_code TEXT;

UPDATE sessions
SET response_gallery_access_code = upper(substr(md5(id::text || join_code || coalesce(created_at::text, now()::text)), 1, 8))
WHERE response_gallery_access_code IS NULL OR response_gallery_access_code = '';

ALTER TABLE sessions
  ALTER COLUMN response_gallery_access_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_response_gallery_access_code
  ON sessions(response_gallery_access_code);
