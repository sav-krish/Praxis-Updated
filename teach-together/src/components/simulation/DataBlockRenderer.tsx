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
  TableBlockData,
  BarChartBlockData,
  LineChartBlockData,
  KpiCardsBlockData,
  TimelineBlockData,
  PieChartBlockData,
} from "@/types/data-blocks";
import {
  isTableBlock,
  isBarChartBlock,
  isLineChartBlock,
  isKpiCardsBlock,
  isTimelineBlock,
  isPieChartBlock,
} from "@/types/data-blocks";

interface DataBlockRendererProps {
  block: SimulationDataBlock;
}

export function DataBlockRenderer({ block }: DataBlockRendererProps) {
  if (isTableBlock(block)) {
    const data = block.data as TableBlockData;
    return (
      <div className="my-4 overflow-x-auto rounded-lg border">
        {block.title && (
          <div className="border-b bg-muted/50 px-4 py-2 text-sm font-medium">
            {block.title}
          </div>
        )}
        <table className="w-full min-w-[200px] text-sm">
          <thead>
            <tr>
              {(data.headers || []).map((h, i) => (
                <th key={i} className="border-b bg-muted/30 px-4 py-2 text-left font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((row, ri) => (
              <tr key={ri} className="border-b last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

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
    const series = data.series || [];
    const allPoints = series.flatMap((s) => s.data || []);
    const xLabels = [...new Set(allPoints.map((p) => p.x))];
    const chartData = xLabels.map((x) => {
      const point: Record<string, string | number> = { name: x };
      for (const s of series) {
        const p = s.data?.find((d) => d.x === x);
        point[s.label] = p?.y ?? 0;
      }
      return point;
    });
    const colors = ["hsl(var(--primary))", "#5BA2D8", "#516481"];
    return (
      <div className="my-4 overflow-x-auto rounded-lg border bg-card p-4">
        {block.title && (
          <div className="mb-4 text-sm font-medium">{block.title}</div>
        )}
        <div className="h-[220px] min-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {series.map((s, i) => (
                <Line
                  key={s.label}
                  type="monotone"
                  dataKey={s.label}
                  stroke={colors[i % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (isKpiCardsBlock(block)) {
    const data = block.data as KpiCardsBlockData;
    const items = data.items || [];
    return (
      <div className="my-4">
        {block.title && (
          <div className="mb-2 text-sm font-medium">{block.title}</div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border bg-muted/30 p-4 text-center"
            >
              <div className="text-xl font-semibold">{item.value}</div>
              <div className="text-xs font-medium text-muted-foreground">
                {item.label}
              </div>
              {item.subtext && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {item.subtext}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isTimelineBlock(block)) {
    const data = block.data as TimelineBlockData;
    const events = data.events || [];
    return (
      <div className="my-4">
        {block.title && (
          <div className="mb-4 text-sm font-medium">{block.title}</div>
        )}
        <div className="space-y-0">
          {events.map((evt, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-primary" />
                {i < events.length - 1 && (
                  <div className="my-0.5 h-full w-px bg-border" />
                )}
              </div>
              <div className="pb-6">
                <div className="text-sm font-medium">{evt.title}</div>
                <div className="text-xs text-muted-foreground">{evt.date}</div>
                {evt.detail && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {evt.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
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
    const colors = ["hsl(var(--primary))", "#5BA2D8", "#516481", "#7dd3fc", "#94a3b8"];
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
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
}
