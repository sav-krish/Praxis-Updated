"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SimulationSource } from "@/types/database";
import { FieldInfoHint } from "@/components/ui/field-info-hint";

interface SourcesEditorProps {
  simulationId: string;
  sources: SimulationSource[];
  onSave: (sources: SimulationSource[]) => Promise<void>;
}

export function SourcesEditor({ simulationId, sources: initial, onSave }: SourcesEditorProps) {
  const [sources, setSources] = useState(initial);
  const [saving, setSaving] = useState(false);

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        simulation_id: simulationId,
        label: "",
        url: "",
        source_type: "manual",
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const update = (id: string, field: string, value: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const remove = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(sources);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Sources & references</h3>
          <FieldInfoHint>
            Shown on the scenario screen under this heading. Type labels (File, Link, Text, Manual) match the student view.
          </FieldInfoHint>
        </div>
        <Button size="sm" variant="outline" onClick={addSource}>
          <Plus className="h-4 w-4 mr-1" /> Add Source
        </Button>
      </div>

      {sources.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No sources added yet.</p>
      )}

      {sources.map((source) => (
        <div key={source.id} className="flex gap-2 items-start">
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">Label / Citation</Label>
              <Input
                placeholder="e.g. HBR (2023). Managing Crisis\u2026"
                value={source.label}
                onChange={(e) => update(source.id, "label", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={source.source_type}
                onValueChange={(v) => update(source.id, "source_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                  <SelectItem value="url">Link (URL)</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <Label className="text-xs">URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={source.url ?? ""}
                onChange={(e) => update(source.id, "url", e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-5 text-destructive"
            onClick={() => remove(source.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {sources.length > 0 && (
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving\u2026" : "Save Sources"}
        </Button>
      )}
    </div>
  );
}
