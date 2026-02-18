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
  const [barChartEditMode, setBarChartEditMode] = useState(false);
  const [pieChartEditMode, setPieChartEditMode] = useState(false);
  const [timelineEditMode, setTimelineEditMode] = useState(false);
  const [lineChartEditMode, setLineChartEditMode] = useState(false);

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
              className="w-full text-left px-4 py-3 flex items-center gap-3 bg-transparent hover:bg-muted transition-colors duration-150"
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

  // Bar chart editor - direct label/value editing
  if (block.block_type === "bar_chart") {
    const d = block.data as BarChartBlockData;
    const labels = d.labels || [];
    const values = d.values || [];
    const items = labels.map((l, i) => ({ label: l, value: values[i] ?? 0 }));
    const ensureItems = items.length ? items : [{ label: "", value: 0 }];

    const updateItem = (idx: number, field: "label" | "value", val: string | number) => {
      const next = [...ensureItems];
      if (!next[idx]) next[idx] = { label: "", value: 0 };
      if (field === "label") next[idx].label = String(val);
      else next[idx].value = typeof val === "number" ? val : parseFloat(String(val)) || 0;
      updateData({
        ...d,
        labels: next.map((x) => x.label),
        values: next.map((x) => x.value),
      });
    };

    const addItem = () =>
      updateData({
        ...d,
        labels: [...labels, ""],
        values: [...values, 0],
      });

    const removeItem = (idx: number) => {
      if (items.length <= 1) return;
      updateData({
        ...d,
        labels: labels.filter((_, i) => i !== idx),
        values: values.filter((_, i) => i !== idx),
      });
    };

    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 bg-transparent hover:bg-muted transition-colors duration-150"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.bar_chart}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled chart"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              {barChartEditMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={block.title || ""}
                      onChange={(e) => updateTitle(e.target.value)}
                      placeholder="Chart title"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Edit bars</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 px-2">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add bar
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {ensureItems.map((item, idx) => (
                        <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Bar {idx + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeItem(idx)}
                              disabled={items.length <= 1}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Label</Label>
                              <Input
                                value={item.label}
                                onChange={(e) => updateItem(idx, "label", e.target.value)}
                                placeholder="e.g. Q1"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Value</Label>
                              <Input
                                type="number"
                                value={item.value}
                                onChange={(e) => updateItem(idx, "value", e.target.value)}
                                placeholder="0"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setBarChartEditMode(false)}>
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
                    <Button variant="outline" size="sm" onClick={() => setBarChartEditMode(true)}>
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
              className="w-full text-left px-4 py-3 flex items-center gap-3 bg-transparent hover:bg-muted transition-colors duration-150"
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

  // Timeline editor - direct event editing
  if (block.block_type === "timeline") {
    const d = block.data as TimelineBlockData;
    const events = d.events || [];
    const ensureEvents = events.length ? events : [{ date: "", title: "", detail: undefined }];

    const updateEvent = (idx: number, field: "date" | "title" | "detail", val: string) => {
      const next = [...ensureEvents];
      if (!next[idx]) next[idx] = { date: "", title: "", detail: undefined };
      next[idx] = { ...next[idx], [field]: field === "detail" ? (val || undefined) : val };
      updateData({ ...d, events: next });
    };

    const addEvent = () =>
      updateData({
        ...d,
        events: [...events, { date: "", title: "", detail: undefined }],
      });

    const removeEvent = (idx: number) => {
      if (events.length <= 1) return;
      updateData({ ...d, events: events.filter((_, i) => i !== idx) });
    };

    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 bg-transparent hover:bg-muted transition-colors duration-150"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.timeline}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled timeline"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              {timelineEditMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={block.title || ""}
                      onChange={(e) => updateTitle(e.target.value)}
                      placeholder="Timeline title"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Edit events</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addEvent} className="h-8 px-2">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add event
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {ensureEvents.map((evt, idx) => (
                        <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Event {idx + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeEvent(idx)}
                              disabled={events.length <= 1}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Date</Label>
                              <Input
                                value={evt.date}
                                onChange={(e) => updateEvent(idx, "date", e.target.value)}
                                placeholder="e.g. Jan 15"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Title</Label>
                              <Input
                                value={evt.title}
                                onChange={(e) => updateEvent(idx, "title", e.target.value)}
                                placeholder="e.g. CEO departs"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Detail (optional)</Label>
                              <Input
                                value={evt.detail || ""}
                                onChange={(e) => updateEvent(idx, "detail", e.target.value)}
                                placeholder="Additional context"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setTimelineEditMode(false)}>
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
                    <Button variant="outline" size="sm" onClick={() => setTimelineEditMode(true)}>
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

  // Pie chart editor - direct label/value editing (same pattern as bar chart)
  if (block.block_type === "pie_chart") {
    const d = block.data as PieChartBlockData;
    const labels = d.labels || [];
    const values = d.values || [];
    const items = labels.map((l, i) => ({ label: l, value: values[i] ?? 0 }));
    const ensureItems = items.length ? items : [{ label: "", value: 0 }];

    const updateItem = (idx: number, field: "label" | "value", val: string | number) => {
      const next = [...ensureItems];
      if (!next[idx]) next[idx] = { label: "", value: 0 };
      if (field === "label") next[idx].label = String(val);
      else next[idx].value = typeof val === "number" ? val : parseFloat(String(val)) || 0;
      updateData({
        ...d,
        labels: next.map((x) => x.label),
        values: next.map((x) => x.value),
      });
    };

    const addItem = () =>
      updateData({
        ...d,
        labels: [...labels, ""],
        values: [...values, 0],
      });

    const removeItem = (idx: number) => {
      if (items.length <= 1) return;
      updateData({
        ...d,
        labels: labels.filter((_, i) => i !== idx),
        values: values.filter((_, i) => i !== idx),
      });
    };

    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 bg-transparent hover:bg-muted transition-colors duration-150"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.pie_chart}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled pie chart"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              {pieChartEditMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={block.title || ""}
                      onChange={(e) => updateTitle(e.target.value)}
                      placeholder="Chart title"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Edit slices</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 px-2">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add slice
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {ensureItems.map((item, idx) => (
                        <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Slice {idx + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeItem(idx)}
                              disabled={items.length <= 1}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Label</Label>
                              <Input
                                value={item.label}
                                onChange={(e) => updateItem(idx, "label", e.target.value)}
                                placeholder="e.g. Product A"
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Value</Label>
                              <Input
                                type="number"
                                value={item.value}
                                onChange={(e) => updateItem(idx, "value", e.target.value)}
                                placeholder="0"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setPieChartEditMode(false)}>
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
                    <Button variant="outline" size="sm" onClick={() => setPieChartEditMode(true)}>
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

  // Line chart editor - direct series/points editing
  if (block.block_type === "line_chart") {
    const d = block.data as LineChartBlockData;
    const series = d.series || [];
    const ensureSeries = series.length ? series : [{ label: "", data: [{ x: "", y: 0 }] }];

    const updateSeriesLabel = (sIdx: number, label: string) => {
      const base = series.length ? series : [{ label: "", data: [{ x: "", y: 0 }] }];
      const next = base.map((s, i) => (i === sIdx ? { ...s, label } : { ...s }));
      updateData({ ...d, series: next });
    };

    const updatePoint = (sIdx: number, pIdx: number, field: "x" | "y", val: string | number) => {
      const base = series.length ? series : [{ label: "", data: [{ x: "", y: 0 }] }];
      const next = base.map((s) => ({ ...s, data: [...(s.data || [])] }));
      if (!next[sIdx]?.data[pIdx]) return;
      if (field === "x") next[sIdx].data[pIdx].x = String(val);
      else next[sIdx].data[pIdx].y = typeof val === "number" ? val : parseFloat(String(val)) || 0;
      updateData({ ...d, series: next });
    };

    const addPoint = (sIdx: number) => {
      const base = series.length ? series : [{ label: "", data: [{ x: "", y: 0 }] }];
      const next = base.map((s, i) =>
        i === sIdx ? { ...s, data: [...(s.data || []), { x: "", y: 0 }] } : { ...s, data: [...(s.data || [])] }
      );
      updateData({ ...d, series: next });
    };

    const removePoint = (sIdx: number, pIdx: number) => {
      const base = series.length ? series : [{ label: "", data: [{ x: "", y: 0 }] }];
      const s = base[sIdx];
      if (!s?.data || s.data.length <= 1) return;
      const next = base.map((ss, i) =>
        i === sIdx ? { ...ss, data: ss.data.filter((_, j) => j !== pIdx) } : { ...ss, data: [...(ss.data || [])] }
      );
      updateData({ ...d, series: next });
    };

    const addSeries = () =>
      updateData({
        ...d,
        series: [...series, { label: "", data: [{ x: "", y: 0 }] }],
      });

    const removeSeries = (sIdx: number) => {
      if (series.length <= 1) return;
      updateData({ ...d, series: series.filter((_, i) => i !== sIdx) });
    };

    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/block">
        <div className="rounded-lg border bg-card overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 py-3 flex items-center gap-3 bg-transparent hover:bg-muted transition-colors duration-150"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <Badge variant="outline">{BLOCK_TYPE_LABELS.line_chart}</Badge>
              <span className="text-sm truncate flex-1">{block.title || "Untitled line chart"}</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/block:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t p-4 space-y-4">
              {lineChartEditMode ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={block.title || ""}
                      onChange={(e) => updateTitle(e.target.value)}
                      placeholder="Chart title"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">X-axis label</Label>
                      <Input
                        value={d.xLabel || ""}
                        onChange={(e) => updateData({ ...d, xLabel: e.target.value })}
                        placeholder="e.g. Month"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Y-axis label</Label>
                      <Input
                        value={d.yLabel || ""}
                        onChange={(e) => updateData({ ...d, yLabel: e.target.value })}
                        placeholder="e.g. Revenue"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Edit series</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSeries} className="h-8 px-2">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add series
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {ensureSeries.map((s, sIdx) => (
                        <div key={sIdx} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                          <div className="flex justify-between items-center gap-2">
                            <Input
                              value={s.label}
                              onChange={(e) => updateSeriesLabel(sIdx, e.target.value)}
                              placeholder={`Series ${sIdx + 1} label`}
                              className="h-8 flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeSeries(sIdx)}
                              disabled={series.length <= 1}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Data points</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => addPoint(sIdx)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add point
                              </Button>
                            </div>
                            {(s.data?.length ? s.data : [{ x: "", y: 0 }]).map((pt, pIdx) => (
                              <div key={pIdx} className="flex gap-2 items-center">
                                <Input
                                  value={pt.x}
                                  onChange={(e) => updatePoint(sIdx, pIdx, "x", e.target.value)}
                                  placeholder="X"
                                  className="h-8 flex-1"
                                />
                                <Input
                                  type="number"
                                  value={pt.y}
                                  onChange={(e) => updatePoint(sIdx, pIdx, "y", e.target.value)}
                                  placeholder="Y"
                                  className="h-8 w-20"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => removePoint(sIdx, pIdx)}
                                  disabled={(s.data?.length || 0) <= 1}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={() => setLineChartEditMode(false)}>
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
                    <Button variant="outline" size="sm" onClick={() => setLineChartEditMode(true)}>
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

  return null;
}
