"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CircleHelp,
  Clock3,
  Compass,
  Frown,
  FileText,
  Gauge,
  ListChecks,
  Medal,
  Meh,
  MessageCircleQuestion,
  PartyPopper,
  Scale,
  Smile,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

export type OnboardingScreenId =
  | "how-it-works"
  | "consequences"
  | "votes"
  | "leaderboard"
  | "ready";

export type SimulationHelpTopicId =
  | Exclude<OnboardingScreenId, "ready">
  | "comparison";

interface SimulationEntryModalProps {
  open: boolean;
  title: string;
  summary: string;
  roleLabel: string;
  decisionCount: number;
  estimatedMinutes: number;
  isNew: boolean;
  onStart: (suppressFuture: boolean) => void;
  onReview: (suppressFuture: boolean) => void;
  onHelpPortalTargetChange?: (target: HTMLDivElement | null) => void;
}

interface SimulationOnboardingCarouselProps {
  open: boolean;
  decisionCount: number;
  classVotesEnabled: boolean;
  leaderboardEnabled: boolean;
  individualMode: boolean;
  startScreen?: OnboardingScreenId;
  onExit: (result: "completed" | "skipped") => void;
  onHelpPortalTargetChange?: (target: HTMLDivElement | null) => void;
}

const FULL_SCREEN_DIALOG_CLASS =
  "!inset-0 !left-0 !top-0 flex !h-dvh !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none sm:!max-w-none";

function EntryMetadata({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:px-6">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="truncate text-sm text-muted-foreground sm:text-base">{value}</p>
      </div>
    </div>
  );
}

export function SimulationEntryModal({
  open,
  title,
  summary,
  roleLabel,
  decisionCount,
  estimatedMinutes,
  isNew,
  onStart,
  onReview,
  onHelpPortalTargetChange,
}: SimulationEntryModalProps) {
  const checkboxId = useId();
  const [suppressFuture, setSuppressFuture] = useState(false);
  const setHelpPortalTarget = useCallback(
    (target: HTMLDivElement | null) => {
      onHelpPortalTargetChange?.(target);
    },
    [onHelpPortalTargetChange],
  );

  const finishEntry = (
    callback: (suppressFutureOnNextVisit: boolean) => void,
    suppressFutureOnNextVisit: boolean,
  ) => {
    setSuppressFuture(false);
    callback(suppressFutureOnNextVisit);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) finishEntry(onStart, false);
      }}
    >
      <DialogContent className={`${FULL_SCREEN_DIALOG_CLASS} overflow-y-auto`} showCloseButton={false}>
        <button
          type="button"
          onClick={() => finishEntry(onStart, false)}
          className="fixed right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-7 sm:top-7"
          aria-label="Close and start simulation"
        >
          <X className="h-6 w-6" aria-hidden />
        </button>

        <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-4 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex flex-wrap items-center gap-3">
              <DialogTitle className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                Welcome to a new simulation!
              </DialogTitle>
              {isNew ? (
                <Badge className="bg-emerald-100 px-3 py-1 text-sm text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-950">
                  New
                </Badge>
              ) : null}
            </div>

            <section className="mt-10" aria-labelledby="entry-simulation-title">
              <h2
                id="entry-simulation-title"
                className="text-2xl font-bold text-foreground sm:text-3xl"
              >
                {title}
              </h2>
              <DialogDescription className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
                {summary ||
                  "Step into the scenario, weigh the trade-offs, and see how your decisions shape the outcome."}
              </DialogDescription>

              <div className="mt-7 grid overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm sm:grid-cols-3">
                <EntryMetadata
                  icon={UserRound}
                  label="Your role"
                  value={roleLabel || "Decision maker"}
                />
                <div className="border-t border-border sm:border-l sm:border-t-0">
                  <EntryMetadata
                    icon={Compass}
                    label="Decisions"
                    value={`${decisionCount} decision${decisionCount === 1 ? "" : "s"}`}
                  />
                </div>
                <div className="border-t border-border sm:border-l sm:border-t-0">
                  <EntryMetadata
                    icon={Clock3}
                    label="Est. time"
                    value={`~${estimatedMinutes} min`}
                  />
                </div>
              </div>
            </section>

            <Separator className="my-9" />

            <section className="text-center" aria-labelledby="entry-review-question">
              <h2
                id="entry-review-question"
                className="text-xl font-semibold text-foreground sm:text-2xl"
              >
                Would you like to review how simulations work before you begin?
              </h2>

              <div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2 sm:gap-5">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-13 w-full text-base"
                  onClick={() => finishEntry(onStart, suppressFuture)}
                >
                  No, start simulation
                </Button>
                <Button
                  type="button"
                  className="min-h-13 w-full text-base"
                  onClick={() => finishEntry(onReview, suppressFuture)}
                >
                  Yes, review onboarding
                </Button>
              </div>

              <label
                htmlFor={checkboxId}
                className="mx-auto mt-7 flex w-fit cursor-pointer items-center gap-3 text-left text-sm font-medium text-foreground sm:text-base"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={suppressFuture}
                  onChange={(event) => setSuppressFuture(event.target.checked)}
                  className="h-5 w-5 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <span>Don't ask me again for future simulations</span>
              </label>

              <p className="mt-5 text-sm text-muted-foreground sm:text-base">
                You can always open onboarding from the Help button.
              </p>
            </section>
          </div>
        </main>
        <div
          ref={setHelpPortalTarget}
          className="fixed bottom-5 right-5 z-[60]"
        />
      </DialogContent>
    </Dialog>
  );
}

const journeySteps = [
  {
    icon: BookOpen,
    title: "Read the brief",
    description: "Understand the context and key information.",
    color:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  },
  {
    icon: ListChecks,
    title: "Make decisions",
    description: "Choose the best option for each scenario.",
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
  },
  {
    icon: Gauge,
    title: "See the consequences",
    description: "See the outcomes of your choices.",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  },
  {
    icon: UsersRound,
    title: "Compare with others",
    description: "See student votes and the leaderboard, if enabled.",
    color:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  },
  {
    icon: FileText,
    title: "Get your report",
    description: "Review your results and key takeaways.",
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200",
  },
] as const;

function HowItWorksScreen({ decisionCount }: { decisionCount: number }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          1
        </span>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">How it works</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        In this simulation, you'll go through 5 key stages.
      </p>

      <ol className="mt-6 space-y-3">
        {journeySteps.map((step, index) => {
          const Icon = step.icon;
          const title =
            index === 1
              ? `Make ${decisionCount} decision${decisionCount === 1 ? "" : "s"}`
              : step.title;
          return (
            <li
              key={step.title}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground sm:gap-4 sm:p-4"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
                {index + 1}
              </span>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${step.color}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground sm:text-base">
                  {title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground sm:text-sm">
                  {step.description}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// XP tier configuration for XP-to-leaderboard mapping
const outcomeTiers = [
  {
    label: "Poor",
    value: "25 XP",
    icon: Frown,
    color: "red",
    borderClass: "border-red-400",
    textClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-950/30",
    iconBgClass: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300",
  },
  {
    label: "Decent",
    value: "50 XP",
    icon: Meh,
    color: "amber",
    borderClass: "border-amber-400",
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    iconBgClass: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300",
  },
  {
    label: "Good",
    value: "75 XP",
    icon: Smile,
    color: "green",
    borderClass: "border-emerald-400",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    iconBgClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  {
    label: "Perfect",
    value: "100 XP",
    icon: Star,
    color: "blue",
    borderClass: "border-blue-400",
    textClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    iconBgClass: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300",
  },
] as const;

const exampleImpacts = [
  { letter: "A", label: "People", width: "w-[82%]", rating: "Strong", severity: "good" as const },
  { letter: "B", label: "Money", width: "w-[54%]", rating: "Mixed", severity: "decent" as const },
  { letter: "C", label: "Strategy", width: "w-[70%]", rating: "Good", severity: "good" as const },
  { letter: "D", label: "Performance", width: "w-[38%]", rating: "Developing", severity: "poor" as const },
] as const;

const barColorMap: Record<string, string> = {
  good: "bg-emerald-500",
  decent: "bg-amber-500",
  poor: "bg-red-500",
};

const pillColorMap: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  decent: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  poor: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

function ConsequencesScreen() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          2
        </span>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Consequences</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        Every decision results in an overall outcome.
      </p>

      {/* Horizontal stepper for XP tiers */}
      <div className="mt-6 flex items-center justify-center gap-0">
        {outcomeTiers.map((tier, index) => {
          const Icon = tier.icon;
          return (
            <div key={tier.label} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tier.iconBgClass} border-2 ${tier.borderClass} bg-transparent`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className={`text-xs font-semibold ${tier.textClass}`}>
                  {tier.label}
                </span>
              </div>
              {index < outcomeTiers.length - 1 && (
                <div className="mx-2 h-px w-8 border-t border-dashed border-muted-foreground/30 sm:mx-4 sm:w-12" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      {/* Trade-off disclaimer box - subtle lavender */}
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50/80 p-4 text-sm leading-relaxed text-foreground dark:border-purple-900 dark:bg-purple-950/30 sm:text-base">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
          <Scale className="h-5 w-5" aria-hidden />
        </span>
        <span>
          There's no single &ldquo;correct&rdquo; answer. Each option has
          trade-offs—some results may be stronger, while others are weaker.
        </span>
      </div>

      {/* What you'll see after each decision - restructured */}
      <section className="mt-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
            <BarChart3 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-bold text-foreground">
              What you'll see after each decision
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Several sub-results, labelled A–D, show different effects of your choice. These examples are illustrative only. Actual categories and ratings depend on the simulation and the option selected.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {exampleImpacts.map((impact) => (
            <div
              key={impact.letter}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground"
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${
                impact.severity === "good" ? "bg-emerald-500" :
                impact.severity === "decent" ? "bg-amber-500" :
                "bg-red-500"
              }`}>
                {impact.letter}
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                {impact.label}
              </span>
              <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block">
                <div className={`h-full rounded-full ${barColorMap[impact.severity]} ${impact.width}`} />
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${pillColorMap[impact.severity]}`}>
                {impact.rating}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function VotesScreen({ individualMode }: { individualMode: boolean }) {
  const title = individualMode ? "Student Votes" : "Class Votes";
  const Icon = individualMode ? BarChart3 : UsersRound;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-bold text-white ${
            individualMode ? "bg-blue-600 dark:bg-blue-500" : "bg-violet-600 dark:bg-violet-500"
          }`}
        >
          3
        </span>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        After each decision, you'll see anonymous votes from other participants.
      </p>

      <section
        className={`mt-7 grid items-center gap-6 rounded-2xl border p-5 sm:grid-cols-[1fr_220px] sm:p-7 ${
          individualMode
            ? "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
            : "border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-100"
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <Icon
              className={`h-5 w-5 ${
                individualMode
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-violet-700 dark:text-violet-300"
              }`}
              aria-hidden
            />
            <p className="font-semibold">
              {individualMode ? "In individual mode" : "In class mode"}
            </p>
          </div>
          <p className="mt-4 text-sm leading-relaxed">
            {individualMode
              ? "You’ll see aggregate voting data from all previous completions of this simulation."
              : "You’ll see votes only from classmates who have already submitted their decisions. Students who submit later may see more voting data."}
          </p>
        </div>

        <div className="flex h-36 items-end justify-center gap-3" aria-hidden>
          {individualMode ? (
            <>
              {[35, 58, 78, 100].map((height, index) => (
                <span
                  key={height}
                  className="w-8 rounded-t-md bg-blue-500/80 dark:bg-blue-400/80"
                  style={{ height: `${height}%`, opacity: 0.55 + index * 0.12 }}
                />
              ))}
            </>
          ) : (
            [UserRound, UserRound, UserRound, UserRound].map((VoteIcon, index) => (
              <span
                key={index}
                className="grid h-12 w-12 place-items-center rounded-full border border-violet-300 bg-background/70 text-violet-700 dark:border-violet-700 dark:text-violet-200"
              >
                <VoteIcon className="h-6 w-6" />
              </span>
            ))
          )}
        </div>
      </section>

      {!individualMode ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
          This screen appears because your instructor has enabled class votes.
        </p>
      ) : null}
    </div>
  );
}

const rankExplanations = [
  {
    icon: Scale,
    title: "Quality over quantity",
    description: "We consider your average XP per decision and how many decisions you’ve completed.",
  },
  {
    icon: TrendingUp,
    title: "Keep improving",
    description: "Completing more decisions at a similar level of quality will rank you higher.",
  },
  {
    icon: UsersRound,
    title: "See how you compare",
    description: "You’re ranked against your classmates in this simulation.",
  },
] as const;

function LeaderboardScreen() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-600 text-white dark:bg-violet-500">
          <Trophy className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Leaderboard</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        Earn XP for every decision outcome and see how you rank against your classmates.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/70 sm:p-5">
          <h3 className="font-bold text-violet-950 dark:text-violet-100">How you earn XP</h3>
          <div className="mt-4 space-y-2">
            {[...outcomeTiers].reverse().map((tier) => (
              <div
                key={tier.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-card-foreground"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Medal className="h-4 w-4 text-primary" aria-hidden />
                  {tier.label} decision
                </span>
                <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
                  {tier.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5">
          <h3 className="font-bold text-foreground">How your rank is calculated</h3>
          <div className="mt-4 space-y-4">
            {rankExplanations.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-violet-300 bg-violet-50 p-4 text-violet-950 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="font-bold">Class Mode</p>
          <p className="mt-1 text-sm">
            You're ranked only against your classmates. Work together, learn together, and
            climb the leaderboard!
          </p>
        </div>
        <div className="flex shrink-0 items-end justify-center gap-2" aria-hidden>
          <span className="grid h-12 w-12 place-items-center rounded-t-lg bg-violet-400 text-white">
            2
          </span>
          <span className="grid h-16 w-12 place-items-center rounded-t-lg bg-violet-600 text-white">
            1
          </span>
          <span className="grid h-10 w-12 place-items-center rounded-t-lg bg-violet-300 text-violet-950">
            3
          </span>
        </div>
      </section>
    </div>
  );
}

function ComparisonHelpScreen({
  classVotesEnabled,
  leaderboardEnabled,
  individualMode,
}: {
  classVotesEnabled: boolean;
  leaderboardEnabled: boolean;
  individualMode: boolean;
}) {
  if (individualMode) {
    return <VotesScreen individualMode />;
  }

  if (!classVotesEnabled && !leaderboardEnabled) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-dashed bg-muted/30 p-5 text-card-foreground sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <CircleHelp className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              Comparison features are unavailable
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Your instructor has not enabled Class Votes or the Leaderboard for this
              simulation, so they will not be available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {classVotesEnabled ? <VotesScreen individualMode={false} /> : null}
      {classVotesEnabled && leaderboardEnabled ? <Separator /> : null}
      {leaderboardEnabled ? <LeaderboardScreen /> : null}
    </div>
  );
}

export function SimulationHelpTopic({
  topic,
  decisionCount,
  individualMode,
  classVotesEnabled,
  leaderboardEnabled,
}: {
  topic: SimulationHelpTopicId;
  decisionCount: number;
  individualMode: boolean;
  classVotesEnabled: boolean;
  leaderboardEnabled: boolean;
}) {
  if (topic === "how-it-works") {
    return <HowItWorksScreen decisionCount={decisionCount} />;
  }
  if (topic === "consequences") return <ConsequencesScreen />;
  if (topic === "comparison") {
    return (
      <ComparisonHelpScreen
        classVotesEnabled={classVotesEnabled}
        leaderboardEnabled={leaderboardEnabled}
        individualMode={individualMode}
      />
    );
  }
  if (topic === "votes") return <VotesScreen individualMode={individualMode} />;
  return <LeaderboardScreen />;
}

const DONT_SHOW_AGAIN_KEY = "praxis_onboarding_dont_show_ready";

function ReadyScreen({ onStart }: { onStart: () => void }) {
  const checkboxId = useId();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleStart = () => {
    if (dontShowAgain) {
      localStorage.setItem(DONT_SHOW_AGAIN_KEY, "1");
    }
    onStart();
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <Trophy className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          Congratulations!
        </h2>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        You've learned the basics—now it's time to put your knowledge into action.
      </p>

      <div className="mt-7 grid items-stretch gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
          <h3 className="font-bold text-foreground">During the simulation</h3>
          <Separator className="my-4" />
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
              <MessageCircleQuestion className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-foreground">Help button</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Tap the Help button anytime to re-open this onboarding from the beginning.
              </p>
            </div>
          </div>
        </section>

        <div className="relative grid min-h-48 place-items-center overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950">
          <span className="grid h-28 w-28 place-items-center rounded-full bg-violet-100 shadow-lg ring-8 ring-white/60 dark:bg-violet-900 dark:ring-violet-950/60">
            <Trophy className="h-16 w-16 text-violet-600 dark:text-violet-300" aria-hidden />
          </span>
        </div>
      </div>

      <label
        htmlFor={checkboxId}
        className="mx-auto mt-5 flex w-fit cursor-pointer items-center gap-3 text-left text-sm font-medium text-foreground"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={dontShowAgain}
          onChange={(event) => setDontShowAgain(event.target.checked)}
          className="h-5 w-5 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <span>Don't show this again</span>
      </label>

      <Button type="button" className="mt-4 min-h-13 w-full text-base" onClick={handleStart}>
        Start simulation
        <ArrowRight className="h-5 w-5" aria-hidden />
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        You can skip onboarding next time you access this simulation.
      </p>
    </div>
  );
}

export function SimulationOnboardingCarousel({
  open,
  decisionCount,
  classVotesEnabled,
  leaderboardEnabled,
  individualMode,
  startScreen = "how-it-works",
  onExit,
  onHelpPortalTargetChange,
}: SimulationOnboardingCarouselProps) {
  const screens = useMemo<OnboardingScreenId[]>(() => {
    const next: OnboardingScreenId[] = ["how-it-works", "consequences"];
    if (individualMode || classVotesEnabled) next.push("votes");
    if (!individualMode && leaderboardEnabled) next.push("leaderboard");
    next.push("ready");
    return next;
  }, [classVotesEnabled, individualMode, leaderboardEnabled]);
  const screenSignature = screens.join("|");
  const startIndex = Math.max(0, screens.indexOf(startScreen));
  const navigationKey = `${screenSignature}:${startScreen}`;
  const [navigation, setNavigation] = useState({ key: "", index: 0 });
  const [skipConfirmationOpen, setSkipConfirmationOpen] = useState(false);
  const setHelpPortalTarget = useCallback(
    (target: HTMLDivElement | null) => {
      onHelpPortalTargetChange?.(target);
    },
    [onHelpPortalTargetChange],
  );

  const currentIndex = navigation.key === navigationKey ? navigation.index : startIndex;
  const safeIndex = Math.min(Math.max(0, currentIndex), screens.length - 1);
  const activeScreen = screens[safeIndex];
  const isReady = activeScreen === "ready";

  const handleExit = (result: "completed" | "skipped") => {
    setNavigation({ key: "", index: 0 });
    setSkipConfirmationOpen(false);
    onExit(result);
  };

  const renderScreen = () => {
    if (activeScreen === "ready") {
      return <ReadyScreen onStart={() => handleExit("completed")} />;
    }
    return (
      <SimulationHelpTopic
        topic={activeScreen}
        decisionCount={decisionCount}
        individualMode={individualMode}
        classVotesEnabled={classVotesEnabled}
        leaderboardEnabled={leaderboardEnabled}
      />
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && open) setSkipConfirmationOpen(true);
        }}
      >
        <DialogContent className={FULL_SCREEN_DIALOG_CLASS} showCloseButton={false}>
          <DialogTitle className="sr-only">Simulation onboarding</DialogTitle>
          <DialogDescription className="sr-only">
            Learn how the simulation works before beginning.
          </DialogDescription>

          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 sm:px-7">
            <p className="text-sm font-medium text-muted-foreground">
              Onboarding · {safeIndex + 1} of {screens.length}
            </p>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSkipConfirmationOpen(true)}
              >
                Skip
              </Button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
            {renderScreen()}
          </main>

          <footer className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-7">
            <div className="mx-auto grid w-full max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setNavigation({
                    key: navigationKey,
                    index: Math.max(0, safeIndex - 1),
                  })
                }
                disabled={safeIndex === 0}
                className="min-h-10"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-1" aria-hidden />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div
                className="flex items-center justify-center gap-2"
                aria-label={`Onboarding step ${safeIndex + 1} of ${screens.length}`}
              >
                {screens.map((screen, index) => (
                  <span
                    key={screen}
                    className={`rounded-full transition-all ${
                      index === safeIndex
                        ? "h-2 w-7 bg-orange-500"
                        : "h-2 w-2 bg-muted-foreground/35 dark:bg-muted-foreground/50"
                    }`}
                    aria-hidden
                  />
                ))}
              </div>

              {isReady ? (
                <span className="w-10 sm:w-[88px]" aria-hidden />
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    setNavigation({
                      key: navigationKey,
                      index: Math.min(screens.length - 1, safeIndex + 1),
                    })
                  }
                  className="min-h-10"
                  aria-label="Next"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="h-4 w-4 sm:ml-1" aria-hidden />
                </Button>
              )}
            </div>
          </footer>
          <div
            ref={setHelpPortalTarget}
            className="fixed bottom-5 right-5 z-[60]"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={skipConfirmationOpen} onOpenChange={setSkipConfirmationOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex items-start gap-3 pr-7">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
              <Target className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <DialogTitle>Skip onboarding completely?</DialogTitle>
              <DialogDescription className="mt-2">
                You can reopen onboarding later from the Help button.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSkipConfirmationOpen(false);
                handleExit("skipped");
              }}
            >
              Skip
            </Button>
            <Button type="button" onClick={() => setSkipConfirmationOpen(false)}>
              <Check className="h-4 w-4" aria-hidden />
              Keep going
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
