"use client";

import { useState, useCallback } from "react";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotContext {
  page?: string;
  simulationTitle?: string;
  subject?: string;
  currentField?: string;
  backgroundContent?: string;
  decisions?: string;
  reflectionQuestions?: string;
  dataBlocks?: string;
  sectionContent?: string;
}

export interface CopilotAction {
  field: string;
  decisionIndex?: number;
  optionIndex?: number;
  questionIndex?: number;
  /** 0-based index; use index === current block count to append a new block */
  blockIndex?: number;
  value: string;
}

export function parseCopilotActions(text: string): { clean: string; actions: CopilotAction[] } {
  const actions: CopilotAction[] = [];
  const clean = text.replace(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/g, (_match, json: string) => {
    try {
      const parsed = JSON.parse(json.trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item.field) continue;
        let value = item.value;
        if (typeof value === "object" && value !== null) {
          value = JSON.stringify(value);
        }
        if (typeof value === "string") {
          actions.push({ ...item, value } as CopilotAction);
        }
      }
    } catch {
      // malformed JSON -- ignore
    }
    return "";
  });
  return { clean: clean.trim(), actions };
}

export function useCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<CopilotAction[]>([]);

  const send = useCallback(
    async (userMessage: string, context?: CopilotContext) => {
      const newMessages: CopilotMessage[] = [
        ...messages,
        { role: "user", content: userMessage },
      ];
      setMessages(newMessages);
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, context }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");

        const { clean, actions } = parseCopilotActions(data.message);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: clean },
        ]);
        if (actions.length > 0) {
          setPendingActions(actions);
        }
        return data.message as string;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  const reset = () => {
    setMessages([]);
    setPendingActions([]);
  };

  const clearPendingActions = () => setPendingActions([]);

  return { messages, loading, error, send, reset, pendingActions, clearPendingActions };
}
