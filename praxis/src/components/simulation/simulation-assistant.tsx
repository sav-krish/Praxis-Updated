"use client";

import { useState } from "react";
import { Bot, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function SimulationAssistant({
  role,
  scenario,
  decision,
}: {
  role: string;
  scenario: string;
  decision?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const send = async () => {
    const message = input.trim();
    if (!message || loading) return;
    const history = messages;
    setMessages([...history, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/simulation-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, role, scenario, decision, history }),
      });
      const result = await response.json();
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.ok ? result.answer : "I’m unavailable right now. Try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <section className="fixed bottom-24 right-4 z-[70] flex h-[min(560px,70vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
          <header className="flex items-center justify-between border-b bg-muted px-4 py-3">
            <div>
              <p className="font-semibold">Praxis Coach</p>
              <p className="text-xs text-muted-foreground">Guidance without giving answers</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close coach">
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="rounded-xl bg-muted p-3 text-sm">
                Ask me to clarify the scenario, explain a metric, or help you think through tradeoffs.
              </p>
            )}
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={`rounded-xl p-3 text-sm ${
                  message.role === "user" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-muted"
                }`}
              >
                {message.content}
              </p>
            ))}
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex gap-2 border-t p-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
              placeholder="Ask about the scenario..."
            />
            <Button size="icon" onClick={() => void send()} disabled={!input.trim() || loading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}
      <Button
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-[70] h-14 rounded-full px-5 shadow-xl"
        aria-label="Open Praxis Coach"
      >
        <Bot className="mr-2 h-5 w-5" />
        Help
      </Button>
    </>
  );
}
