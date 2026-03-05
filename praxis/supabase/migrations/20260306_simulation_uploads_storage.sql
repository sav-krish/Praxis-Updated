-- Simulation uploads: storage bucket + linking table
-- Bucket: simulation-uploads (private, PDF/DOCX/DOC/TXT, 50MB)
-- Table: simulation_uploaded_files links simulations to stored files

-- 1. Create storage bucket (private, file limits, MIME restrictions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'simulation-uploads') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'simulation-uploads',
      'simulation-uploads',
      false,
      52428800,  -- 50MB
      ARRAY[
        'application/pdf',
        'application/x-pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
      ]
    );
  ELSE
    UPDATE storage.buckets
    SET file_size_limit = 52428800,
        allowed_mime_types = ARRAY[
          'application/pdf',
          'application/x-pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain'
        ]
    WHERE id = 'simulation-uploads';
  END IF;
END $$;

-- 2. RLS policies: professors can INSERT (upload) only; no SELECT (files are for Praxis internal use)
-- Path format: {user_id}/{upload_id}/{filename} -> first folder must match auth.uid()

DROP POLICY IF EXISTS "Simulation uploads insert own folder" ON storage.objects;
CREATE POLICY "Simulation uploads insert own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'simulation-uploads'
  AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')
);

DROP POLICY IF EXISTS "Simulation uploads select own folder" ON storage.objects;
-- No SELECT policy: professors cannot read/download stored files (Praxis internal use only)

-- 3. Table: simulation_uploaded_files
CREATE TABLE IF NOT EXISTS simulation_uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_uploaded_files_simulation ON simulation_uploaded_files(simulation_id);

-- RLS for simulation_uploaded_files: professors can INSERT only (link files when creating);
-- admins can SELECT for Praxis internal use; professors cannot read metadata
ALTER TABLE simulation_uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professors can manage own simulation files" ON simulation_uploaded_files;
DROP POLICY IF EXISTS "Professors can insert simulation file links" ON simulation_uploaded_files;
DROP POLICY IF EXISTS "Admins can view simulation uploaded files" ON simulation_uploaded_files;

CREATE POLICY "Professors can insert simulation file links"
ON simulation_uploaded_files FOR INSERT
TO authenticated
WITH CHECK (
  simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
);

CREATE POLICY "Admins can view simulation uploaded files"
ON simulation_uploaded_files FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM professors p WHERE p.id = auth.uid() AND p.is_admin = true)
);
