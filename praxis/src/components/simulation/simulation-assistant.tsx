"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  BookOpen,
  Bug,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Home,
  Loader2,
  Mail,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import {
  SimulationHelpTopic,
  type OnboardingScreenId,
  type SimulationHelpTopicId,
} from "@/components/simulation/preface-modal";

type HelpTab = "home" | "chat" | "contact";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const TECHNICAL_ISSUE_URL = "https://forms.gle/6YQfnscWDy8i3wSP6";
const SUPPORT_EMAIL = "praxis.simulations@gmail.com";
const HELP_USED_KEY_PREFIX = "praxis_help_opened";

const FAQS = [
  {
    question: "Is there a correct answer?",
    answer:
      "No. There is no single correct answer. Different options can lead to good outcomes depending on the scenario.",
  },
  {
    question: "Can I change my answer after submitting?",
    answer:
      "No. Once you submit your decision, it is final so results and comparisons stay accurate.",
  },
  {
    question: "Who can see my justification?",
    answer:
      "Your justification is visible to your teacher and anonymous to your classmates.",
  },
  {
    question: "How are consequences determined?",
    answer:
      "Outcomes are based on the real-world impact of your choice in this scenario, across multiple factors.",
  },
  {
    question: "How does the leaderboard work?",
    answer:
      "You earn XP based on outcomes. Rank is calculated using your average XP and the number of decisions you’ve completed.",
  },
] as const;

export function SimulationAssistant({
  sessionKey,
  decisionCount,
  classVotesEnabled,
  leaderboardEnabled,
  individualMode = false,
  onOpenOnboarding,
  helpPortalTarget = null,
  onReturnToSimulation,
}: {
  sessionKey: string;
  decisionCount: number;
  classVotesEnabled: boolean;
  leaderboardEnabled: boolean;
  individualMode?: boolean;
  onOpenOnboarding: (screen: OnboardingScreenId) => void;
  helpPortalTarget?: HTMLElement | null;
  onReturnToSimulation?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>("home");
  const [topic, setTopic] = useState<SimulationHelpTopicId | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, "up" | "down">>({});
  const [helpUsed, setHelpUsed] = useState(false);
  const [hydratedSessionKey, setHydratedSessionKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const historyStorageKey = `praxis_help_chat_${sessionKey}`;
  const helpUsedStorageKey = `${HELP_USED_KEY_PREFIX}_${sessionKey}`;

  useEffect(() => {
    setHelpUsed(localStorage.getItem(helpUsedStorageKey) === "1");
  }, [helpUsedStorageKey]);

  useEffect(() => {
    const saved = sessionStorage.getItem(historyStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Message[];
        setMessages(
          Array.isArray(parsed)
            ? parsed.filter(
                (message) =>
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string",
              )
            : [],
        );
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
    setFeedback({});
    setHydratedSessionKey(sessionKey);
  }, [historyStorageKey, sessionKey]);

  useEffect(() => {
    if (hydratedSessionKey !== sessionKey) return;
    sessionStorage.setItem(historyStorageKey, JSON.stringify(messages));
  }, [historyStorageKey, hydratedSessionKey, messages, sessionKey]);

  useEffect(() => {
    if (!open || tab !== "chat") return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, tab]);

  const openHelp = () => {
    localStorage.setItem(helpUsedStorageKey, "1");
    setHelpUsed(true);
    setTab("home");
    setTopic(null);
    setOpen(true);
  };

  const openOnboarding = (screen: OnboardingScreenId) => {
    setOpen(false);
    setTopic(null);
    onOpenOnboarding(screen);
  };

  const openTopic = (nextTopic: SimulationHelpTopicId) => {
    setTopic(nextTopic);
  };

  const closeHelp = () => {
    setOpen(false);
    setTopic(null);
  };

  const returnToSimulation = () => {
    closeHelp();
    onReturnToSimulation?.();
  };

  const send = async (rawMessage?: string) => {
    const message = (rawMessage ?? input).trim();
    if (!message || loading) return;

    const history = messages.slice(-10);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/simulation-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "help", message, history }),
      });
      const result = (await response.json().catch(() => null)) as
        | { answer?: string }
        | null;
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            response.ok && result?.answer
              ? result.answer
              : "I’m unavailable right now. Please try again shortly.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I’m unavailable right now. Please try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = input.trim();
    if (!query) return;
    setTab("chat");
    void send(query);
  };

  const quickHelp = [
    {
      title: "Reopen onboarding",
      description: "Review the full onboarding experience",
      icon: RotateCcw,
      action: () => openOnboarding("how-it-works"),
    },
    {
      title: "How the simulation works",
      description: "Learn about each stage",
      icon: BookOpen,
      action: () => openTopic("how-it-works"),
    },
    {
      title: "How consequences work",
      description: "Understand outcomes and results",
      icon: TrendingUp,
      action: () => openTopic("consequences"),
    },
    {
      title:
        individualMode
          ? "Student Votes"
          : classVotesEnabled && leaderboardEnabled
            ? "Class Votes and Leaderboard"
            : classVotesEnabled
              ? "Class Votes"
              : leaderboardEnabled
                ? "Leaderboard"
                : "Class Votes and Leaderboard",
      description: "See how comparison features work",
      icon: Users,
      action: () => openTopic("comparison"),
    },
  ];

  const helpOverlay = open ? (
        <div className="fixed inset-0 z-[90]" aria-hidden={false}>
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[1px]"
            aria-label="Close help"
            onClick={closeHelp}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Praxis help"
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-col overflow-hidden border bg-card text-card-foreground shadow-2xl",
              topic
                ? "h-[min(82dvh,680px)] rounded-t-3xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(82dvh,680px)] sm:w-[min(560px,calc(100vw-3rem))] sm:rounded-3xl"
                : "h-[min(92dvh,760px)] rounded-t-3xl sm:inset-y-0 sm:left-auto sm:h-dvh sm:w-[min(430px,100vw)] sm:rounded-none sm:rounded-l-3xl",
            )}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4">
              <div className="flex min-w-0 items-start gap-2">
                {topic ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="-ml-2 h-9 w-9 shrink-0"
                    onClick={() => setTopic(null)}
                    aria-label="Back to Quick Help"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                ) : null}
                <div>
                  <h2 className="text-lg font-bold">
                    {topic ? "Quick Help" : "How can we help?"}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {topic
                      ? "Review this part of the simulation."
                      : tab === "contact"
                        ? "If you need more help, our support team is here for you."
                        : "Get quick answers or review how Praxis works."}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {topic ? <ThemeToggle /> : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={closeHelp}
                  aria-label="Close help"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {topic ? (
                <SimulationHelpTopic
                  topic={topic}
                  decisionCount={decisionCount}
                  individualMode={individualMode}
                  classVotesEnabled={classVotesEnabled}
                  leaderboardEnabled={leaderboardEnabled}
                />
              ) : null}

              {!topic && tab === "home" ? (
                <div className="space-y-6">
                  <form onSubmit={submitSearch} className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask a question about this simulation…"
                      aria-label="Ask Praxis a question"
                      className="h-12 pl-10 pr-12"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="absolute right-1.5 top-1.5 h-9 w-9"
                      disabled={!input.trim() || loading}
                      aria-label="Ask question"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </form>

                  <section aria-labelledby="quick-help-heading">
                    <h3
                      id="quick-help-heading"
                      className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                    >
                      Quick Help
                    </h3>
                    <div className="overflow-hidden rounded-xl border bg-background">
                      {quickHelp.map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={item.action}
                            className={cn(
                              "flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                              index > 0 && "border-t",
                            )}
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold">
                                {item.title}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section aria-labelledby="common-questions-heading">
                    <h3
                      id="common-questions-heading"
                      className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"
                    >
                      Common Questions
                    </h3>
                    <div className="overflow-hidden rounded-xl border bg-background">
                      {FAQS.map((item, index) => {
                        const expanded = expandedFaq === index;
                        return (
                          <div key={item.question} className={cn(index > 0 && "border-t")}>
                            <button
                              type="button"
                              className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                              aria-expanded={expanded}
                              onClick={() =>
                                setExpandedFaq((current) =>
                                  current === index ? null : index,
                                )
                              }
                            >
                              {item.question}
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                  expanded && "rotate-180",
                                )}
                              />
                            </button>
                            {expanded ? (
                              <p className="px-3 pb-3 text-sm leading-relaxed text-muted-foreground">
                                {item.answer}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              ) : null}

              {!topic && tab === "chat" ? (
                <div className="flex min-h-full flex-col">
                  <div className="flex-1 space-y-3 pb-4">
                    {messages.length === 0 ? (
                      <div className="rounded-xl border bg-muted/50 p-4 text-sm">
                        Ask about how Praxis simulations, consequences, votes,
                        leaderboards, or reflections work. I can explain the process,
                        but I can’t recommend an answer.
                      </div>
                    ) : null}
                    {messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={cn(
                          "max-w-[88%]",
                          message.role === "user" ? "ml-auto" : "mr-auto",
                        )}
                      >
                        <p
                          className={cn(
                            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                            message.role === "user"
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md border bg-muted",
                          )}
                        >
                          {message.content}
                        </p>
                        {message.role === "assistant" ? (
                          <div
                            className="mt-1 flex items-center gap-1"
                            aria-label="Rate this response"
                          >
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "h-8 w-8",
                                feedback[index] === "up" && "text-emerald-600",
                              )}
                              aria-label="Helpful response"
                              aria-pressed={feedback[index] === "up"}
                              onClick={() =>
                                setFeedback((current) => ({
                                  ...current,
                                  [index]: "up",
                                }))
                              }
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className={cn(
                                "h-8 w-8",
                                feedback[index] === "down" && "text-red-600",
                              )}
                              aria-label="Not helpful response"
                              aria-pressed={feedback[index] === "down"}
                              onClick={() =>
                                setFeedback((current) => ({
                                  ...current,
                                  [index]: "down",
                                }))
                              }
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Praxis is responding…
                      </div>
                    ) : null}
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void send();
                    }}
                    className="sticky bottom-0 flex gap-2 border-t bg-card pt-3"
                  >
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask how Praxis works…"
                      aria-label="Message Praxis help"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || loading}
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              ) : null}

              {!topic && tab === "contact" ? (
                <div className="space-y-3">
                  <a
                    href={TECHNICAL_ISSUE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-20 items-center gap-3 rounded-xl border bg-background p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                      <Bug className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">Report a technical issue</span>
                      <span className="block text-sm text-muted-foreground">
                        Let us know if something isn’t working
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="flex min-h-20 items-center gap-3 rounded-xl border bg-background p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <Mail className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">Email us</span>
                      <span className="block break-all text-sm text-muted-foreground">
                        {SUPPORT_EMAIL}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                </div>
              ) : null}
            </div>

            {topic ? (
              <footer className="grid shrink-0 gap-2 border-t bg-card p-3 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => setTopic(null)}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to Help
                </Button>
                <Button type="button" onClick={returnToSimulation}>
                  Back to simulation
                </Button>
              </footer>
            ) : (
              <nav
                className="safe-area-inset-bottom grid shrink-0 grid-cols-3 border-t bg-card"
                aria-label="Help sections"
              >
                {[
                  { id: "home" as const, label: "Home", icon: Home },
                  { id: "chat" as const, label: "Chat", icon: MessageCircle },
                  { id: "contact" as const, label: "Contact", icon: Mail },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={cn(
                        "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        active
                          ? "text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            )}
          </section>
        </div>
      ) : null;

  const helpTrigger = (
    <Button
      type="button"
      onClick={openHelp}
      className={cn(
        "h-12 rounded-full shadow-xl sm:h-14",
        helpPortalTarget ? "" : "fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5",
        helpUsed ? "w-12 sm:w-14 px-0" : "px-4 sm:px-5",
      )}
      aria-label="Open help"
    >
      <HelpCircle className={cn("h-5 w-5 sm:h-6 sm:w-6", !helpUsed && "mr-2")} />
      {!helpUsed ? <span className="text-sm sm:text-base">Help</span> : null}
    </Button>
  );

  return (
    <>
      {helpOverlay
        ? helpPortalTarget
          ? createPortal(helpOverlay, helpPortalTarget)
          : helpOverlay
        : null}
      {helpPortalTarget ? createPortal(helpTrigger, helpPortalTarget) : helpTrigger}
    </>
  );
}
