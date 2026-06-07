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

export function DataBlockChartRenderer({ block }: { block: SimulationDataBlock }) {
  if (isBarChartBlock(block)) {
    const data = block.data as BarChartBlockData;
    const chartData = (data.labels || []).map((label, i) => ({
      name: label,
      value: (data.values || [])[i] ?? 0,
    }));
    return (
      <div className="my-4 overflow-x-auto rounded-lg border bg-card p-4">
        {block.title && (
          <div className="mb-4 text-sm font-medium">{block.title}</div>
        )}
        <div className="h-[220px] min-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (isLineChartBlock(block)) {
    const data = block.data as LineChartBlockData;
    const series = (data.series || []).map((s, i) => ({
      label: s.label?.trim() || `Series ${i + 1}`,
      data: s.data || [],
    }));
    const allPoints = series.flatMap((s) => s.data);
    const xLabels = [...new Set(allPoints.map((p) => p.x))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
    const chartData = xLabels.map((x) => {
      const point: Record<string, string | number | null> = { name: x };
      for (const s of series) {
        const p = s.data.find((d) => d.x === x);
        point[s.label] = p?.y ?? null;
      }
      return point;
    });
    const colors = ["hsl(var(--primary))", "#fd8c2e", "#f76224"];
    return (
      <div className="my-4 overflow-x-auto rounded-lg border bg-card p-4">
        {block.title && (
          <div className="mb-4 text-sm font-medium">{block.title}</div>
        )}
        <div className="h-[220px] min-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                label={data.xLabel ? { value: data.xLabel, position: "insideBottom", offset: -4 } : undefined}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={data.yLabel ? { value: data.yLabel, angle: -90, position: "insideLeft" } : undefined}
              />
              <Tooltip
                formatter={(value: string | number | readonly (string | number)[] | null | undefined) => [
                  Array.isArray(value) ? value.join(", ") : (value ?? "—"),
                  data.yLabel || "Value",
                ]}
              />
              <Legend />
              {series.map((s, i) => (
                <Line
                  key={s.label}
                  type="monotone"
                  dataKey={s.label}
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
    const colors = ["hsl(var(--primary))", "#fd8c2e", "#f76224", "#f9a25e", "#ffd0a8"];
    return (
      <div className="my-4 overflow-x-auto rounded-lg border bg-card p-4">
        {block.title && (
          <div className="mb-4 text-sm font-medium">{block.title}</div>
        )}
        <div className="h-[220px] min-w-[200px]">
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
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number | undefined) => [value ?? 0, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
}
