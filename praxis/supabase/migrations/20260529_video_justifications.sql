-- Video justifications for individual-mode simulations

ALTER TABLE simulations
  ADD COLUMN IF NOT EXISTS justification_type TEXT NOT NULL DEFAULT 'written'
  CHECK (justification_type IN ('written', 'video'));

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS video_gallery_share_id UUID NOT NULL DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_video_gallery_share_id
  ON sessions(video_gallery_share_id);

CREATE TABLE IF NOT EXISTS response_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID NOT NULL UNIQUE REFERENCES responses(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_videos_session_decision_option
  ON response_videos(session_id, decision_id, option_id);

CREATE INDEX IF NOT EXISTS idx_response_videos_participant
  ON response_videos(participant_id);

ALTER TABLE response_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert response videos" ON response_videos;
CREATE POLICY "Anyone can insert response videos" ON response_videos
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Professors can view response videos for own simulations" ON response_videos;
CREATE POLICY "Professors can view response videos for own simulations" ON response_videos
  FOR SELECT USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all response videos" ON response_videos;
CREATE POLICY "Admins can view all response videos" ON response_videos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM professors p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'response-videos') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'response-videos',
      'response-videos',
      false,
      104857600,
      ARRAY[
        'video/webm',
        'video/mp4',
        'video/quicktime'
      ]
    );
  ELSE
    UPDATE storage.buckets
    SET file_size_limit = 104857600,
        allowed_mime_types = ARRAY[
          'video/webm',
          'video/mp4',
          'video/quicktime'
        ]
    WHERE id = 'response-videos';
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can upload response videos" ON storage.objects;
CREATE POLICY "Anyone can upload response videos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'response-videos');
