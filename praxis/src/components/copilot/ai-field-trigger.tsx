"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function cleanAiResponse(raw: string, fieldLabel: string): string {
  let text = raw.trim();
  text = text.replace(/^"""\s*/g, "").replace(/\s*"""$/g, "");
  text = text.replace(/^```\s*/g, "").replace(/\s*```$/g, "");
  const labelPattern = new RegExp(
    `^#+\\s*${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n*`,
    "i"
  );
  text = text.replace(labelPattern, "");
  const plainPattern = new RegExp(
    `^${fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`,
    "i"
  );
  text = text.replace(plainPattern, "");
  return text.trim();
}

interface AiFieldTriggerProps {
  fieldLabel: string;
  onApply: (value: string) => void;
  previousValue?: string;
  onUndo?: () => void;
  context?: Record<string, string>;
  className?: string;
}

export function AiFieldTrigger({
  fieldLabel,
  onApply,
  previousValue,
  onUndo,
  context,
  className,
}: AiFieldTriggerProps) {
  const [active, setActive]   = useState(false);
  const [prompt, setPrompt]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState("");
  const [applied, setApplied] = useState(false);

  const handleTriggerClick = () => {
    setActive((a) => !a);
    if (active) {
      setResult("");
      setApplied(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Write the "${fieldLabel}" for a simulation. Instructions: ${prompt}`,
            },
          ],
          context,
        }),
      });
      const data = await res.json();
      setResult(cleanAiResponse(data.message, fieldLabel));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    onApply(result);
    setApplied(true);
    setActive(false);
    setResult("");
    setPrompt("");
  };

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
      setApplied(false);
    }
  };

  return (
    <div className={cn("relative", className)}>

      {/* Trigger button */}
      <button
        type="button"
        onClick={handleTriggerClick}
        className={cn(
          "absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200",
          active
            ? "bg-primary text-primary-foreground animate-copilot-glow"
            : "text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10"
        )}
        title={`Use AI to write ${fieldLabel}`}
      >
        <Sparkles className="h-3.5 w-3.5" />
      </button>

      {/* Undo button — appears after content is applied */}
      {applied && onUndo && (
        <button
          type="button"
          onClick={handleUndo}
          className="absolute right-10 top-2 z-10 flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600 hover:bg-purple-500/20 transition-colors"
        >
          ↩ Undo AI
        </button>
      )}

      {/* AI mode panel */}
      {active && (
        <div className="mt-1 rounded-lg p-3 space-y-2 animate-ai-panel-in animate-aurora-border bg-background">
          <p className="text-xs font-semibold shimmer-label">
            ✦ AI Mode — {fieldLabel}
          </p>

          <Textarea
            autoFocus
            placeholder={`Describe what you want in the ${fieldLabel}…`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            className="text-sm min-h-[60px] border-purple-200 focus-visible:ring-purple-400"
            rows={2}
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="bg-linear-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white border-0"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {loading ? "Generating…" : "Generate"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setActive(false);
                setResult("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Loading shimmer skeleton */}
          {loading && (
            <div className="space-y-2 pt-1">
              <div className="h-3 w-full rounded bg-linear-to-r from-purple-100 via-cyan-100 to-purple-100 animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-linear-to-r from-purple-100 via-cyan-100 to-purple-100 animate-pulse" />
              <div className="h-3 w-4/6 rounded bg-linear-to-r from-purple-100 via-cyan-100 to-purple-100 animate-pulse" />
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div className="rounded-md border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 p-2 space-y-2">
              <p className="text-xs whitespace-pre-wrap text-foreground">{result}</p>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-linear-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white border-0"
              >
                ✓ Apply to field
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
