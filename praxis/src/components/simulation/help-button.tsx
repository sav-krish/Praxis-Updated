"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, X, Send, Bot } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HelpButtonProps {
  simulationTitle?: string;
  currentStep?: string;
  role?: string;
  decisionPrompt?: string;
}

export function HelpButton({
  simulationTitle,
  currentStep = "briefing",
  role,
  decisionPrompt,
}: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your Praxis copilot. Ask me anything about the simulation, your role, or the current decision you're facing.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/copilot/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage }],
          context: {
            simulationTitle,
            currentStep,
            role,
            decisionPrompt,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to get response");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again or ask your instructor for help.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={[
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isOpen
            ? "bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600"
            : "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500",
        ].join(" ")}
        aria-label={isOpen ? "Close help chat" : "Open help chat"}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageSquare className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Praxis Copilot</p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Ask me anything</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[400px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={[
                  "flex items-start gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                    <Bot className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                )}
                <div
                  className={[
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-amber-500 text-white dark:bg-amber-600"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200",
                  ].join(" ")}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                  <Bot className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="max-w-[85%] rounded-xl px-3 py-2 bg-zinc-100 dark:bg-zinc-800">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={1}
                className="min-h-[40px] resize-none dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
              <Button
                type="button"
                size="icon"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || loading}
                className="h-10 w-10 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}