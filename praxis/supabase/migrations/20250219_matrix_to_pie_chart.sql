-- Replace matrix block type with pie_chart
-- Matrix blocks use incompatible data format (rows/cols/values) vs pie_chart (labels/values)
-- Remove any existing matrix blocks before changing the constraint
DELETE FROM simulation_data_blocks WHERE block_type = 'matrix';

ALTER TABLE simulation_data_blocks DROP CONSTRAINT IF EXISTS simulation_data_blocks_block_type_check;
ALTER TABLE simulation_data_blocks ADD CONSTRAINT simulation_data_blocks_block_type_check
  CHECK (block_type IN ('table', 'bar_chart', 'line_chart', 'kpi_cards', 'timeline', 'pie_chart'));
