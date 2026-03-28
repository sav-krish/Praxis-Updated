"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Bot, X, Send, RotateCcw, Zap, CheckCircle2, Loader2, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCopilot, type CopilotContext, type CopilotAction } from "@/hooks/use-copilot";
import { toast } from "sonner";

const MarkdownBody = dynamic(
  () =>
    import("@/components/ui/markdown-body").then((m) => m.MarkdownBody),
  {
    ssr: false,
    loading: () => (
      <span className="inline-block h-4 min-w-[8rem] animate-pulse rounded bg-muted/80" />
    ),
  }
);

export interface FocusedSection {
  label: string;
  sectionContext: string;
}

interface CopilotPanelProps {
  context?: CopilotContext;
  onAction?: (actions: CopilotAction[]) => boolean | Promise<boolean>;
  onUndo?: () => void;
  open: boolean;
  onToggle: () => void;
  focusedSection?: FocusedSection | null;
  onClearFocus?: () => void;
}

function describeAction(a: CopilotAction): string {
  if (a.field === "background_content") return "Update background content";
  if (a.field === "title") return "Update simulation title";
  if (a.field === "decision_prompt") return `Update Decision ${(a.decisionIndex ?? 0) + 1} prompt`;
  if (a.field === "option_description") return `Update D${(a.decisionIndex ?? 0) + 1} Option ${String.fromCharCode(65 + (a.optionIndex ?? 0))} description`;
  if (a.field === "option_consequence") return `Update D${(a.decisionIndex ?? 0) + 1} Option ${String.fromCharCode(65 + (a.optionIndex ?? 0))} consequence`;
  if (a.field === "option_title") return `Update D${(a.decisionIndex ?? 0) + 1} Option ${String.fromCharCode(65 + (a.optionIndex ?? 0))} title`;
  if (a.field === "reflection_question") return `Update Reflection Q${(a.questionIndex ?? 0) + 1}`;
  if (a.field === "data_block") {
    let titleHint = "";
    try {
      const p = JSON.parse(a.value) as { title?: string };
      if (p.title) titleHint = `: "${p.title.slice(0, 40)}${p.title.length > 40 ? "…" : ""}"`;
    } catch {
      /* ignore */
    }
    return `Graph / data block (slot ${(a.blockIndex ?? 0) + 1})${titleHint}`;
  }
  return `Update ${a.field}`;
}

export function CopilotPanel({ context, onAction, onUndo, open, onToggle, focusedSection, onClearFocus }: CopilotPanelProps) {
  const [input, setInput] = useState("");
  const [appliedAt, setAppliedAt] = useState<number | null>(null);
  const { messages, loading, send, reset, pendingActions, clearPendingActions } = useCopilot();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, pendingActions]);

  useEffect(() => {
    if (open && focusedSection) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, focusedSection]);

  const mergedContext = useCallback((): CopilotContext | undefined => {
    if (!focusedSection) return context;
    return {
      ...context,
      currentField: focusedSection.label,
      sectionContent: focusedSection.sectionContext,
    };
  }, [context, focusedSection]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setAppliedAt(null);
    await send(msg, mergedContext());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const [applying, setApplying] = useState(false);

  const handleApplyActions = useCallback(async () => {
    if (!onAction || pendingActions.length === 0 || applying) return;
    setApplying(true);
    try {
      const success = await onAction(pendingActions);
      if (success) {
        setAppliedAt(Date.now());
        toast.success(`Applied ${pendingActions.length} change${pendingActions.length > 1 ? "s" : ""}`);
        clearPendingActions();
      } else {
        toast.error("Some changes couldn't be applied");
      }
    } finally {
      setApplying(false);
    }
  }, [onAction, pendingActions, clearPendingActions, applying]);

  const canApply = onAction && pendingActions.length > 0;

  const placeholder = focusedSection
    ? `Tell AI what to change in ${focusedSection.label}\u2026`
    : onAction
      ? "Ask to edit any field\u2026"
      : "Ask about simulations\u2026";

  return (
    <>
      {/* FAB */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          "bg-linear-to-br from-purple-500 to-cyan-500 text-white hover:from-purple-600 hover:to-cyan-600",
          open && "rotate-12 animate-copilot-glow"
        )}
        aria-label={open ? "Close Praxis Copilot" : "Open Praxis Copilot"}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>

      {/* Floating chat panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={onToggle}
          />

          <div
            className={cn(
              "fixed z-50 flex flex-col bg-background shadow-2xl overflow-hidden animate-ai-panel-in animate-aurora-border",
              "inset-x-0 bottom-0 rounded-t-xl h-[75dvh] max-h-[600px]",
              "sm:inset-auto sm:bottom-20 sm:right-6 sm:w-[380px] sm:h-[min(560px,75vh)] sm:rounded-xl"
            )}
          >
            <div className="flex justify-center pt-2 pb-0 sm:hidden">
              <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b px-3 sm:px-4 py-2.5 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm">Praxis Copilot</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { reset(); setAppliedAt(null); }} title="Clear chat">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle} title="Close copilot">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Focused section badge */}
            {focusedSection && (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 border-b bg-purple-50/50 dark:bg-purple-950/20 shrink-0">
                <Sparkles className="h-3 w-3 text-purple-500 shrink-0" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300 truncate">
                  Editing: {focusedSection.label}
                </span>
                {onClearFocus && (
                  <button
                    type="button"
                    onClick={onClearFocus}
                    className="ml-auto text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 shrink-0"
                    title="Clear focus"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 px-3 sm:px-4 py-3">
              {messages.length === 0 && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Hi! I&apos;m your Praxis Copilot</p>
                  {focusedSection ? (
                    <p>
                      Ready to edit <strong className="text-foreground">{focusedSection.label}</strong>. Describe what you want changed.
                    </p>
                  ) : (
                    <p>I can <strong className="text-foreground">directly edit</strong> your simulation:</p>
                  )}
                  {!focusedSection && (
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      <li>Rewrite or improve any text field</li>
                      <li>Add or edit charts, tables, KPI cards, and timelines (Apply, then Undo if needed)</li>
                      <li>Remove, shorten, or expand content</li>
                      <li>Make decisions more realistic and draft reflection questions</li>
                    </ul>
                  )}
                  <p className="text-xs">
                    {focusedSection
                      ? <em>e.g. &quot;Make it more concise&quot; or &quot;Add more detail&quot;</em>
                      : <>Try: <em>&quot;Remove the second paragraph of the background&quot;</em></>}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(focusedSection
                      ? [
                          "Improve this section",
                          "Make it more concise",
                          "More detail",
                          "Make it more challenging",
                        ]
                      : onAction
                        ? [
                            "Improve the background",
                            "Add a bar chart for the KPIs",
                            "Rewrite Decision 1",
                            "Better consequences",
                          ]
                        : [
                            "Simulation ideas",
                            "Help write a decision",
                            "Good consequences?",
                            "Reflection questions",
                          ]
                    ).map((chip) => (
                      <button
                        key={chip}
                        className="text-xs rounded-full border px-2.5 py-1 hover:bg-muted transition-colors"
                        onClick={() => send(chip, mergedContext())}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "mb-3 max-w-[92%] rounded-lg px-3 py-2 text-sm [&_a]:underline [&_strong]:font-semibold",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground [&_a]:text-primary-foreground/90"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div className="whitespace-pre-wrap wrap-break-word [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <MarkdownBody className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      {m.content}
                    </MarkdownBody>
                  </div>
                </div>
              ))}

              {canApply && (
                <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    {pendingActions.length} change{pendingActions.length > 1 ? "s" : ""} ready
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {pendingActions.map((a, i) => (
                      <li key={i} className="truncate">&bull; {describeAction(a)}</li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={handleApplyActions} disabled={applying}>
                      {applying ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Applying&hellip;
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 mr-1.5" />
                          Apply
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearPendingActions} disabled={applying}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {appliedAt && !canApply && (
                <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/5 p-2.5 flex items-center justify-between gap-2 text-xs text-green-700 dark:text-green-400">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Changes applied — review the editor; Undo reverses text and graph edits</span>
                  </div>
                  {onUndo && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-7 text-xs border-green-500/40 hover:bg-green-500/10"
                      onClick={() => { onUndo(); setAppliedAt(null); }}
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Undo
                    </Button>
                  )}
                </div>
              )}

              {loading && (
                <div className="mb-3 max-w-[88%] rounded-lg px-3 py-2 text-sm bg-muted">
                  <span className="animate-pulse">Thinking&hellip;</span>
                </div>
              )}
              <div ref={bottomRef} />
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-2.5 sm:p-3 flex gap-2 shrink-0">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="min-h-[38px] sm:min-h-[40px] max-h-[100px] sm:max-h-[120px] resize-none text-sm"
                rows={1}
              />
              <Button size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10" onClick={handleSend} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
