-- Library flagship pins (admin / service_role only) + scenario images for immersive play

-- 1) Simulations: pin columns
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE simulations ADD COLUMN IF NOT EXISTS pinned_order INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_simulations_library_pins ON simulations (is_public, is_pinned, pinned_order)
  WHERE is_public = true AND is_pinned = true;

-- 2) Only service_role or DB admins may change pin fields (professor updates use user JWT)
CREATE OR REPLACE FUNCTION public.simulations_enforce_pin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.is_pinned IS DISTINCT FROM OLD.is_pinned)
     OR (NEW.pinned_order IS DISTINCT FROM OLD.pinned_order) THEN
    IF COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.professors p
      WHERE p.id = auth.uid() AND p.is_admin = true
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Pin fields can only be changed by admins or service role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_simulations_enforce_pin_fields ON simulations;
CREATE TRIGGER trg_simulations_enforce_pin_fields
  BEFORE UPDATE ON simulations
  FOR EACH ROW
  EXECUTE FUNCTION public.simulations_enforce_pin_fields();

-- 3) Scenario images metadata (files live in storage bucket simulation-scenario-images)
CREATE TABLE IF NOT EXISTS simulation_scenario_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt_text TEXT,
  order_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (simulation_id, order_num)
);

CREATE INDEX IF NOT EXISTS idx_simulation_scenario_images_simulation
  ON simulation_scenario_images(simulation_id);

ALTER TABLE simulation_scenario_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scenario images manage via simulation" ON simulation_scenario_images;
CREATE POLICY "Scenario images manage via simulation"
  ON simulation_scenario_images
  FOR ALL
  USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  )
  WITH CHECK (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can read scenario images" ON simulation_scenario_images;
CREATE POLICY "Anyone can read scenario images"
  ON simulation_scenario_images
  FOR SELECT
  USING (true);

-- 4) Public storage bucket for scenario images (students load without auth)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'simulation-scenario-images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'simulation-scenario-images',
      'simulation-scenario-images',
      true,
      10485760,
      ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif'
      ]
    );
  ELSE
    UPDATE storage.buckets
    SET public = true,
        file_size_limit = 10485760,
        allowed_mime_types = ARRAY[
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif'
        ]
    WHERE id = 'simulation-scenario-images';
  END IF;
END $$;

-- Path: {simulation_id}/{filename} — first folder must be a simulation owned by the user
DROP POLICY IF EXISTS "Scenario images insert own simulation folder" ON storage.objects;
CREATE POLICY "Scenario images insert own simulation folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'simulation-scenario-images'
    AND EXISTS (
      SELECT 1 FROM simulations s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Scenario images update own simulation folder" ON storage.objects;
CREATE POLICY "Scenario images update own simulation folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'simulation-scenario-images'
    AND EXISTS (
      SELECT 1 FROM simulations s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Scenario images delete own simulation folder" ON storage.objects;
CREATE POLICY "Scenario images delete own simulation folder"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'simulation-scenario-images'
    AND EXISTS (
      SELECT 1 FROM simulations s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.professor_id = auth.uid()
    )
  );
