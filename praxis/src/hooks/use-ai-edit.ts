"use client";

import { useState, useCallback, useRef } from "react";
import type { CopilotAction } from "@/hooks/use-copilot";

interface FieldSetter {
  (field: string, value: string, opts?: {
    decisionIndex?: number;
    optionIndex?: number;
    questionIndex?: number;
  }): void;
}

interface FieldGetter {
  (field: string, opts?: {
    decisionIndex?: number;
    optionIndex?: number;
    questionIndex?: number;
  }): string;
}

interface UndoEntry {
  actions: CopilotAction[];
  previous: { action: CopilotAction; oldValue: string }[];
}

const CHARS_PER_TICK = 3;
const TICK_MS = 8;

export function useAiEdit(setField: FieldSetter, getField: FieldGetter) {
  const [typing, setTyping] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const abortRef = useRef<(() => void) | null>(null);

  const stopTyping = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
  }, []);

  const typewriterApply = useCallback(
    (action: CopilotAction): Promise<void> => {
      return new Promise((resolve) => {
        const target = action.value;
        const opts = {
          decisionIndex: action.decisionIndex,
          optionIndex: action.optionIndex,
          questionIndex: action.questionIndex,
        };
        let pos = 0;
        let cancelled = false;

        abortRef.current = () => {
          cancelled = true;
          setField(action.field, target, opts);
          resolve();
        };

        const tick = () => {
          if (cancelled) return;
          pos = Math.min(pos + CHARS_PER_TICK, target.length);
          setField(action.field, target.slice(0, pos), opts);
          if (pos < target.length) {
            setTimeout(tick, TICK_MS);
          } else {
            abortRef.current = null;
            resolve();
          }
        };

        tick();
      });
    },
    [setField]
  );

  const applyActions = useCallback(
    async (actions: CopilotAction[]): Promise<boolean> => {
      const previous: UndoEntry["previous"] = [];
      for (const a of actions) {
        const oldValue = getField(a.field, {
          decisionIndex: a.decisionIndex,
          optionIndex: a.optionIndex,
          questionIndex: a.questionIndex,
        });
        previous.push({ action: a, oldValue });
      }

      setTyping(true);
      setRedoStack([]);

      for (const a of actions) {
        await typewriterApply(a);
      }

      setTyping(false);
      setUndoStack((prev) => [...prev, { actions, previous }]);
      return true;
    },
    [getField, typewriterApply]
  );

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      for (const { action, oldValue } of last.previous) {
        setField(action.field, oldValue, {
          decisionIndex: action.decisionIndex,
          optionIndex: action.optionIndex,
          questionIndex: action.questionIndex,
        });
      }
      setRedoStack((r) => [...r, last]);
      return prev.slice(0, -1);
    });
  }, [setField]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      for (const a of last.actions) {
        setField(a.field, a.value, {
          decisionIndex: a.decisionIndex,
          optionIndex: a.optionIndex,
          questionIndex: a.questionIndex,
        });
      }
      setUndoStack((u) => [...u, last]);
      return prev.slice(0, -1);
    });
  }, [setField]);

  return {
    applyActions,
    undo,
    redo,
    typing,
    stopTyping,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length,
  };
}
