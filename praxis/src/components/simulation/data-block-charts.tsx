"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type {
  SimulationDataBlock,
  BarChartBlockData,
  LineChartBlockData,
  PieChartBlockData,
} from "@/types/data-blocks";
import {
  isBarChartBlock,
  isLineChartBlock,
  isPieChartBlock,
} from "@/types/data-blocks";

function chartCanvasWidth(pointCount: number, pixelsPerPoint = 76) {
  return Math.max(320, pointCount * pixelsPerPoint);
}

export function DataBlockChartRenderer({ block }: { block: SimulationDataBlock }) {
  if (isBarChartBlock(block)) {
    const data = block.data as BarChartBlockData;
    const chartData = (data.labels || []).map((label, i) => ({
      name: label,
      value: (data.values || [])[i] ?? 0,
    }));
    const canvasWidth = chartCanvasWidth(chartData.length);
    return (
      <div
        className="praxis-chart-surface my-4 overflow-x-auto overscroll-x-contain rounded-lg border bg-card p-4 touch-pan-x"
        tabIndex={0}
        aria-label={block.title ? `${block.title} chart` : "Bar chart"}
      >
        {block.title && (
          <div className="mb-4 text-sm font-medium">{block.title}</div>
        )}
        <div className="h-[220px]" style={{ minWidth: `${canvasWidth}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (isLineChartBlock(block)) {
    const data = block.data as LineChartBlockData;
    const series = (data.series || []).map((s, i) => ({
      key: `series_${i}`,
      label: s.label?.trim() || `Series ${i + 1}`,
      data: s.data || [],
    }));
    const allPoints = series.flatMap((s) => s.data);
    const uniqueXLabelCount = new Set(allPoints.map((p) => p.x)).size;
    const maxSeriesLength = Math.max(0, ...series.map((s) => s.data.length));
    const useIndexAlignment = uniqueXLabelCount < maxSeriesLength;

    const chartData = useIndexAlignment
      ? Array.from({ length: maxSeriesLength }, (_, index) => {
          const labelFromSeries = series.find((s) => s.data[index]?.x)?.data[index]?.x;
          const point: Record<string, string | number | null> = {
            name: labelFromSeries || `Point ${index + 1}`,
          };
          for (const s of series) {
            point[s.key] = s.data[index]?.y ?? null;
          }
          return point;
        })
      : [...new Set(allPoints.map((p) => p.x))]
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
          .map((x) => {
            const point: Record<string, string | number | null> = { name: x };
            for (const s of series) {
              const p = s.data.find((d) => d.x === x);
              point[s.key] = p?.y ?? null;
            }
              return point;
            });
    const colors = ["#e75b0c", "#4ade80", "#60a5fa"];
    const canvasWidth = chartCanvasWidth(chartData.length);
    return (
      <div
        className="praxis-chart-surface my-4 overflow-x-auto overscroll-x-contain rounded-lg border bg-card p-4 touch-pan-x"
        tabIndex={0}
        aria-label={block.title ? `${block.title} chart` : "Line chart"}
      >
        {block.title && (
          <div className="mb-4 text-sm font-medium">{block.title}</div>
        )}
        <div className="h-[220px]" style={{ minWidth: `${canvasWidth}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                label={data.xLabel ? { value: data.xLabel, position: "insideBottom", offset: -4, fill: "var(--muted-foreground)" } : undefined}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                label={data.yLabel ? { value: data.yLabel, angle: -90, position: "insideLeft", fill: "var(--muted-foreground)" } : undefined}
              />
              <Tooltip
                formatter={(value: string | number | readonly (string | number)[] | null | undefined) => [
                  Array.isArray(value) ? value.join(", ") : (value ?? "—"),
                  data.yLabel || "Value",
                ]}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
              <Legend wrapperStyle={{ color: "var(--foreground)" }} />
              {series.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  connectNulls={false}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{
                        r: 4,
                        strokeWidth: 2,
                    stroke: colors[i % colors.length],
                    fill: colors[i % colors.length],
                  }}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: colors[i % colors.length],
                    fill: colors[i % colors.length],
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (isPieChartBlock(block)) {
    const data = block.data as PieChartBlockData;
    const chartData = (data.labels || []).map((label, i) => ({
      name: label,
      value: (data.values || [])[i] ?? 0,
    }));
    const colors = ["#e75b0c", "#4ade80", "#fbbf24", "#f87171", "#60a5fa"];
    const canvasWidth = chartCanvasWidth(chartData.length, 96);
    return (
      <div
        className="praxis-chart-surface my-4 overflow-x-auto overscroll-x-contain rounded-lg border bg-card p-4 touch-pan-x"
        tabIndex={0}
        aria-label={block.title ? `${block.title} chart` : "Pie chart"}
      >
        {block.title && (
          <div className="mb-4 text-sm font-medium">{block.title}</div>
        )}
        <div className="h-[220px]" style={{ minWidth: `${canvasWidth}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={
                  data.showLabels !== false
                    ? ({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    : false
                }
                labelLine={
                  data.showLabels !== false
                    ? { stroke: "var(--muted-foreground)" }
                    : false
                }
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(
                  value: string | number | readonly (string | number)[] | null | undefined,
                ) => [Array.isArray(value) ? value.join(", ") : (value ?? 0), ""]}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
}
