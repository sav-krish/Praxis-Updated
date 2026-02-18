-- Data blocks for simulations: tables, charts, timelines, etc.
-- AI generates these; professors can edit them.
-- Uses IF NOT EXISTS / IF EXISTS so migration is safe when table already exists.

CREATE TABLE IF NOT EXISTS simulation_data_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('table', 'bar_chart', 'line_chart', 'kpi_cards', 'timeline', 'pie_chart')),
  title TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(simulation_id, order_num)
);

CREATE INDEX IF NOT EXISTS idx_simulation_data_blocks_simulation ON simulation_data_blocks(simulation_id);

ALTER TABLE simulation_data_blocks ENABLE ROW LEVEL SECURITY;

-- Policies: drop first so re-run is safe (avoids "policy already exists")
DROP POLICY IF EXISTS "Access data blocks via simulation" ON simulation_data_blocks;
DROP POLICY IF EXISTS "Anyone can read data blocks" ON simulation_data_blocks;

CREATE POLICY "Access data blocks via simulation" ON simulation_data_blocks
  FOR ALL USING (
    simulation_id IN (SELECT id FROM simulations WHERE professor_id = auth.uid())
  );

CREATE POLICY "Anyone can read data blocks" ON simulation_data_blocks
  FOR SELECT USING (true);
