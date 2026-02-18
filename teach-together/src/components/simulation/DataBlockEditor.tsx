"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Trash2, GripVertical, Plus, Minus, Pencil, Check } from "lucide-react";
import { DataBlockRenderer } from "./DataBlockRenderer";
import type {
  SimulationDataBlock,
  DataBlockType,
  TableBlockData,
  BarChartBlockData,
  LineChartBlockData,
  KpiCardsBlockData,
  TimelineBlockData,
  PieChartBlockData,
} from "@/types/data-blocks";

const BLOCK_TYPE_LABELS: Record<DataBlockType, string> = {
  table: "Table",
  bar_chart: "Bar Chart",
  line_chart: "Line Chart",
  kpi_cards: "KPI Cards",
  timeline: "Timeline",
  pie_chart: "Pie Chart",
};

interface DataBlockEditorProps {
  block: SimulationDataBlock;
  onUpdate: (block: SimulationDataBlock) => void;
  onDelete: () => void;
}

export function DataBlockEditor({ block, onUpdate, onDelete }: DataBlockEditorProps) {
  const [open, setOpen] = useState(false);
  const [tableEditMode, setTableEditMode] = useState(false);
  const [kpiEditMode, setKpiEditMode] = useState(false);

  const updateData = (data: SimulationDataBlock["data"]) => {
    onUpdate({ ...block, data });
  };

  const updateTitle = (title: string | null) => {
    onUpdate({ ...block, title: title || null });
  };

  // Table editor - direct cell editing
  if (block.block_type === "table") {
    const d = block.data as TableBlockData;
    const headers = d.headers?.length ? d.headers : [""];
    const rows = d.rows?.length ? d.rows : [headers.map(() => "")];

    const updateHeader = (colIndex: number, value: string) => {
      const next = [...headers];
      next[colIndex] = value;
      updateData({ ...d, headers: next });
    };

    const updateCell = (rowIndex: number, colIndex: number, value: string) => {
      const next = rows.map((r) => [...r]);
      while (next[rowIndex].length <= colIndex) next[rowIndex].push("");
      next[rowIndex][colIndex] = value;
      updateData({ ...d, rows: next });
    };

    const addColumn = () => {
      updateData({
        ...d,
        headers: [...headers, ""],
        rows: rows.map((r) => [...r, ""]),
      });
    };

    const removeColumn = (colIndex: number) => {
      if (headers.length <= 1) return;
      updateData({
        ...d,
        headers: headers.filter((_, i) => i !== colIndex),
        rows: rows.map((r) => r.filter((_, i) => i !== colIndex)),
      });
    };

    const addRow = () => {
      updateData({
        ...d,
        rows: [...rows, headers.map(() => "")],
      });
    };

    const removeRow = (rowIndex: number) => {
      if (rows.length <= 1) return;
      updateData({
        ...d,
        rows: rows.filter((_, i) => i !== rowIndex),
      });
    };

    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.table}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled table"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              {tableEditMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={block.title || ""}
                      onChange={(e) => updateTitle(e.target.value)}
                      placeholder="Table title"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <Label>Edit table</Label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addColumn}
                          className="h-8 px-2"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Column
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addRow}
                          className="h-8 px-2"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Row
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full min-w-[300px] border-collapse">
                        <thead>
                          <tr>
                            {headers.map((h, ci) => (
                              <th key={ci} className="border p-0">
                                <div className="flex">
                                  <Input
                                    value={h}
                                    onChange={(e) => updateHeader(ci, e.target.value)}
                                    placeholder={`Col ${ci + 1}`}
                                    className="rounded-none border-0 focus-visible:ring-1 min-w-[80px]"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeColumn(ci)}
                                    disabled={headers.length <= 1}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </th>
                            ))}
                            <th className="border p-0 w-10 bg-muted/30" title="Remove row" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, ri) => (
                            <tr key={ri}>
                              {headers.map((_, ci) => (
                                <td key={ci} className="border p-0">
                                  <Input
                                    value={row[ci] ?? ""}
                                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                                    placeholder=""
                                    className="rounded-none border-0 focus-visible:ring-1 min-w-[80px]"
                                  />
                                </td>
                              ))}
                              <td className="border p-0 w-10 align-middle">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeRow(ri)}
                                  disabled={rows.length <= 1}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setTableEditMode(false)}>
                      <Check className="h-4 w-4 mr-2" />
                      Done
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <DataBlockRenderer block={block} />
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setTableEditMode(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Bar chart editor
  if (block.block_type === "bar_chart") {
    const d = block.data as BarChartBlockData;
    const labels = d.labels || [];
    const values = d.values || [];
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.bar_chart}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled chart"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={block.title || ""}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder="Chart title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Labels (comma-separated)</Label>
                  <Input
                    value={labels.join(", ")}
                    onChange={(e) =>
                      updateData({
                        ...d,
                        labels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="A, B, C"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Values (comma-separated numbers)</Label>
                  <Input
                    value={values.join(", ")}
                    onChange={(e) =>
                      updateData({
                        ...d,
                        values: e.target.value
                          .split(",")
                          .map((s) => parseFloat(s.trim()) || 0),
                      })
                    }
                    placeholder="10, 20, 30"
                  />
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <DataBlockRenderer block={block} />
                </div>
                <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // KPI cards editor
  if (block.block_type === "kpi_cards") {
    const d = block.data as KpiCardsBlockData;
    const items = d.items || [];
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.kpi_cards}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled KPI cards"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              {kpiEditMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={block.title || ""}
                      onChange={(e) => updateTitle(e.target.value)}
                      placeholder="Section title"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Edit cards</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateData({
                            ...d,
                            items: [...items, { label: "", value: "", subtext: undefined }],
                          })
                        }
                        className="h-8 px-2"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add card
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {(items.length ? items : [{ label: "", value: "", subtext: undefined }]).map((item, idx) => (
                        <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Card {idx + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() =>
                                updateData({
                                  ...d,
                                  items: items.filter((_, i) => i !== idx),
                                })
                              }
                              disabled={items.length <= 1}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Label</Label>
                              <Input
                                value={item.label}
                                onChange={(e) => {
                                  const next = items.length ? [...items] : [item];
                                  next[idx] = { ...next[idx], label: e.target.value };
                                  updateData({ ...d, items: next });
                                }}
                                placeholder="e.g. Revenue"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Value</Label>
                              <Input
                                value={item.value}
                                onChange={(e) => {
                                  const next = items.length ? [...items] : [item];
                                  next[idx] = { ...next[idx], value: e.target.value };
                                  updateData({ ...d, items: next });
                                }}
                                placeholder="e.g. $2.1M"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Subtext (optional)</Label>
                              <Input
                                value={item.subtext || ""}
                                onChange={(e) => {
                                  const next = items.length ? [...items] : [item];
                                  next[idx] = { ...next[idx], subtext: e.target.value || undefined };
                                  updateData({ ...d, items: next });
                                }}
                                placeholder="e.g. Q3"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setKpiEditMode(false)}>
                      <Check className="h-4 w-4 mr-2" />
                      Done
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <DataBlockRenderer block={block} />
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setKpiEditMode(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Timeline editor
  if (block.block_type === "timeline") {
    const d = block.data as TimelineBlockData;
    const events = d.events || [];
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.timeline}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled timeline"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={block.title || ""}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder="Timeline title"
                />
              </div>
              <div className="space-y-2">
                <Label>Events (date | title | detail per line)</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border px-3 py-2 text-sm"
                  value={events.map((e) => `${e.date}|${e.title}|${e.detail || ""}`).join("\n")}
                  onChange={(e) =>
                    updateData({
                      ...d,
                      events: e.target.value.split("\n").map((line) => {
                        const [date, title, detail] = line.split("|").map((s) => s.trim());
                        return { date: date || "", title: title || "", detail: detail || undefined };
                      }),
                    })
                  }
                  placeholder="Jan 15|CEO departs|Announced suddenly&#10;Feb 1|Interim appointed"
                />
              </div>
              <div className="flex justify-between items-start">
                <DataBlockRenderer block={block} />
                <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Pie chart editor (same structure as bar chart)
  if (block.block_type === "pie_chart") {
    const d = block.data as PieChartBlockData;
    const labels = d.labels || [];
    const values = d.values || [];
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.pie_chart}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled pie chart"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={block.title || ""}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder="Chart title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Labels (comma-separated)</Label>
                  <Input
                    value={labels.join(", ")}
                    onChange={(e) =>
                      updateData({
                        ...d,
                        labels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="A, B, C"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Values (comma-separated numbers)</Label>
                  <Input
                    value={values.join(", ")}
                    onChange={(e) =>
                      updateData({
                        ...d,
                        values: e.target.value
                          .split(",")
                          .map((s) => parseFloat(s.trim()) || 0),
                      })
                    }
                    placeholder="30, 50, 20"
                  />
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <DataBlockRenderer block={block} />
                </div>
                <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Line chart: simpler editor (raw-ish)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/block">
      <div className="rounded-lg border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <Badge variant="outline">{BLOCK_TYPE_LABELS.line_chart}</Badge>
            <span className="text-sm truncate flex-1">{block.title || "Untitled line chart"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={block.title || ""}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Title"
              />
            </div>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <DataBlockRenderer block={block} />
              </div>
              <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
