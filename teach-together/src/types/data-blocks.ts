// Data block types for simulations (tables, charts, timelines, etc.)

export type DataBlockType = "table" | "bar_chart" | "line_chart" | "kpi_cards" | "timeline" | "pie_chart";

export interface TableBlockData {
  headers: string[];
  rows: string[][];
}

export interface BarChartBlockData {
  labels: string[];
  values: number[];
  valueLabel?: string;
}

export interface LineChartBlockData {
  xLabel: string;
  yLabel?: string;
  series: { label: string; data: { x: string; y: number }[] }[];
}

export interface KpiCardsBlockData {
  items: { label: string; value: string; subtext?: string }[];
}

export interface TimelineEvent {
  date: string;
  title: string;
  detail?: string;
}

export interface TimelineBlockData {
  events: TimelineEvent[];
}

export interface PieChartBlockData {
  labels: string[];
  values: number[];
}

export type DataBlockPayload =
  | TableBlockData
  | BarChartBlockData
  | LineChartBlockData
  | KpiCardsBlockData
  | TimelineBlockData
  | PieChartBlockData;

export interface SimulationDataBlock {
  id: string;
  simulation_id: string;
  order_num: number;
  block_type: DataBlockType;
  title: string | null;
  data: DataBlockPayload;
  created_at?: string;
}

// Type guards for payload
export function isTableBlock(b: SimulationDataBlock): b is SimulationDataBlock & { data: TableBlockData } {
  return b.block_type === "table";
}
export function isBarChartBlock(b: SimulationDataBlock): b is SimulationDataBlock & { data: BarChartBlockData } {
  return b.block_type === "bar_chart";
}
export function isLineChartBlock(b: SimulationDataBlock): b is SimulationDataBlock & { data: LineChartBlockData } {
  return b.block_type === "line_chart";
}
export function isKpiCardsBlock(b: SimulationDataBlock): b is SimulationDataBlock & { data: KpiCardsBlockData } {
  return b.block_type === "kpi_cards";
}
export function isTimelineBlock(b: SimulationDataBlock): b is SimulationDataBlock & { data: TimelineBlockData } {
  return b.block_type === "timeline";
}
export function isPieChartBlock(b: SimulationDataBlock): b is SimulationDataBlock & { data: PieChartBlockData } {
  return b.block_type === "pie_chart";
}
