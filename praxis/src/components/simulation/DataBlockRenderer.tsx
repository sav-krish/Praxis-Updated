"use client";

import dynamic from "next/dynamic";
import type {
  SimulationDataBlock,
  TableBlockData,
  KpiCardsBlockData,
  TimelineBlockData,
} from "@/types/data-blocks";
import {
  isTableBlock,
  isBarChartBlock,
  isLineChartBlock,
  isKpiCardsBlock,
  isTimelineBlock,
  isPieChartBlock,
} from "@/types/data-blocks";

const DataBlockChartRenderer = dynamic(
  () =>
    import("./data-block-charts").then((m) => m.DataBlockChartRenderer),
  {
    loading: () => (
      <div className="my-4 h-[220px] animate-pulse rounded-lg border bg-muted/30" />
    ),
    ssr: false,
  }
);

interface DataBlockRendererProps {
  block: SimulationDataBlock;
}

export function DataBlockRenderer({ block }: DataBlockRendererProps) {
  if (
    isBarChartBlock(block) ||
    isLineChartBlock(block) ||
    isPieChartBlock(block)
  ) {
    return <DataBlockChartRenderer block={block} />;
  }

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

  return null;
}
