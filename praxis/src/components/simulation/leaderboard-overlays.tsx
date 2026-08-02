"use client";

import { TrendingUp, Trophy, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type LeaderboardTier = "Perfect" | "Good" | "Decent" | "Poor";

export type LeaderboardRow = {
  participantId: string;
  displayName: string;
  isViewer: boolean;
  rank: number | null;
  score: number;
  averageXp: number | null;
  completedDecisions: number;
  totalDecisions: number;
  perfectCount: number;
  percentile: number | null;
  percentileLabel: string | null;
};

export type TieInfo = {
  tiedCount: number;
  tiedNames: string[];
  tieBreakReason: string | null;
  tieBreakAboveName: string | null;
  playersAhead: number;
};

export type LeaderboardPayload = {
  rows: LeaderboardRow[];
  topThree: LeaderboardRow[];
  viewer: LeaderboardRow;
  above: (LeaderboardRow & { gapXp: number }) | null;
  tieInfo: TieInfo;
  latestDecision: {
    decisionId: string;
    decisionNumber: number;
    tier: LeaderboardTier;
    xp: number;
  } | null;
  totalDecisions: number;
  scopeLabel: string;
  scope: "class" | "individual";
  settings: {
    leaderboardEnabled: boolean;
    rankChipEnabled: boolean;
    canShowPodium: boolean;
  };
};

type LeaderboardOverlaysProps = {
  code: string;
  sessionId: string;
  participantId: string;
};

type DecisionConsequenceDetail = {
  decisionId: string;
  isFinal: boolean;
};

type RankUpdate = {
  decisionId: string;
  isFinal: boolean;
  snapshot: LeaderboardPayload;
};

const TIER_STYLES: Record<LeaderboardTier, string> = {
  Perfect:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200",
  Good:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  Decent:
    "border-lime-200 bg-lime-50 text-lime-900 dark:border-lime-700 dark:bg-lime-950 dark:text-lime-200",
  Poor:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200",
};

const PODIUM_STYLES = {
  1: {
    avatar:
      "bg-amber-100 text-amber-700 ring-amber-50 dark:bg-amber-950/70 dark:text-amber-300 dark:ring-card",
    platform:
      "h-32 border-amber-300 bg-gradient-to-b from-amber-200 to-amber-500 text-amber-950 shadow-lg shadow-amber-500/20 dark:border-amber-500/70 dark:from-amber-400 dark:to-amber-700 dark:text-amber-50",
  },
  2: {
    avatar:
      "bg-slate-100 text-slate-700 ring-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-card",
    platform:
      "h-24 border-slate-300 bg-gradient-to-b from-slate-100 to-slate-300 text-slate-700 shadow-lg shadow-slate-400/15 dark:border-slate-500 dark:from-slate-500 dark:to-slate-700 dark:text-slate-50",
  },
  3: {
    avatar:
      "bg-orange-100 text-orange-700 ring-orange-50 dark:bg-orange-950/70 dark:text-orange-300 dark:ring-card",
    platform:
      "h-20 border-orange-300 bg-gradient-to-b from-orange-200 to-orange-500 text-orange-950 shadow-lg shadow-orange-500/20 dark:border-orange-500/70 dark:from-orange-400 dark:to-orange-700 dark:text-orange-50",
  },
} as const;

type PodiumPlacement = 1 | 2 | 3;

function formatScore(score: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(score);
}

function tieBreakExplanation(reason: string): string {
  switch (reason) {
    case "higher raw average XP":
      return "they have a higher raw average XP";
    case "more decisions completed":
      return "they have completed more decisions";
    case "more Perfect outcomes":
      return "they have more Perfect outcomes";
    default:
      return reason;
  }
}

function playersAheadMessage(playersAhead: number): string {
  return `${playersAhead} ranked ${
    playersAhead === 1 ? "player is" : "players are"
  } ahead of you.`;
}

function copyPayload(payload: LeaderboardPayload): LeaderboardPayload {
  return {
    ...payload,
    rows: payload.rows.map((row) => ({ ...row })),
    topThree: payload.topThree.map((row) => ({ ...row })),
    viewer: { ...payload.viewer },
    above: payload.above ? { ...payload.above } : null,
    tieInfo: { ...payload.tieInfo },
    latestDecision: payload.latestDecision
      ? { ...payload.latestDecision }
      : null,
    settings: { ...payload.settings },
  };
}

function isDecisionConsequenceDetail(
  detail: unknown,
): detail is DecisionConsequenceDetail {
  if (!detail || typeof detail !== "object") return false;

  const candidate = detail as Partial<DecisionConsequenceDetail>;
  return (
    typeof candidate.decisionId === "string" &&
    candidate.decisionId.length > 0 &&
    typeof candidate.isFinal === "boolean"
  );
}

function PodiumStanding({
  row,
  placement,
}: {
  row: LeaderboardRow;
  placement: PodiumPlacement;
}) {
  const style = PODIUM_STYLES[placement];

  return (
    <article
      className="flex min-w-0 animate-in fade-in-0 slide-in-from-bottom-3 flex-col items-center text-center duration-500 motion-reduce:animate-none"
    >
      <div
        className={cn(
          "grid h-12 w-12 place-items-center rounded-full ring-4 sm:h-14 sm:w-14",
          style.avatar,
        )}
      >
        {placement === 1 ? (
          <Trophy className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        ) : (
          <UserRound className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
        )}
      </div>
      <p className="mt-2 w-full truncate text-xs font-semibold text-foreground sm:text-sm">
        {row.displayName}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground sm:text-base">
        {formatScore(row.score)}
      </p>
      {row.isViewer ? (
        <span className="mt-1 rounded-full bg-primary px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-primary-foreground">
          YOU
        </span>
      ) : null}
      <div
        className={cn(
          "mt-3 flex w-full items-center justify-center rounded-t-xl border-x border-t text-2xl font-black tabular-nums sm:text-3xl",
          style.platform,
        )}
      >
        {row.rank ?? placement}
      </div>
    </article>
  );
}

function FinalViewerStanding({ row }: { row: LeaderboardRow }) {
  return (
    <section
      className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 sm:flex-nowrap sm:gap-5"
      aria-label="Your final standing"
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <UserRound className="h-7 w-7" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">You</p>
        <p className="mt-0.5 text-lg font-black text-foreground">
          {row.rank === null ? "Not ranked yet" : `#${row.rank}`}
        </p>
      </div>
      <div className="ml-auto grid grid-cols-2 gap-x-5 gap-y-1 text-right text-sm sm:gap-x-8">
        <p className="text-xs text-muted-foreground">Your score</p>
        <p className="text-xs text-muted-foreground">Decisions</p>
        <p className="font-bold tabular-nums text-foreground">
          {formatScore(row.score)}
        </p>
        <p className="font-bold tabular-nums text-foreground">
          {row.completedDecisions}/{row.totalDecisions}
        </p>
      </div>
    </section>
  );
}

function EndLeaderboardReveal({
  snapshot,
  onClose,
}: {
  snapshot: LeaderboardPayload;
  onClose: () => void;
}) {
  const showPodium = snapshot.settings.canShowPodium;
  const podiumRows = snapshot.topThree.slice(0, 3);
  const viewerInTopThree = showPodium && podiumRows.some(
    (row) => row.participantId === snapshot.viewer.participantId,
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94dvh] w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-3xl border-border/80 bg-card p-0 shadow-2xl sm:max-w-4xl">
        <DialogHeader className="border-b border-border/70 bg-gradient-to-b from-primary/10 to-transparent px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <DialogTitle className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
              <Trophy className="h-6 w-6 text-primary sm:h-7 sm:w-7" aria-hidden />
              Final leaderboard <span aria-hidden>🎉</span>
            </DialogTitle>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold tracking-wide text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              LIVE
            </span>
          </div>
          <DialogDescription className="mt-1 text-center text-sm sm:text-left sm:text-base">
            Updates in real time as students finish.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8" aria-live="polite">
          {showPodium && podiumRows.length > 0 ? (
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-5">
              {podiumRows[1] ? (
                <PodiumStanding row={podiumRows[1]} placement={2} />
              ) : <div />}
              {podiumRows[0] ? (
                <PodiumStanding row={podiumRows[0]} placement={1} />
              ) : <div />}
              {podiumRows[2] ? (
                <PodiumStanding row={podiumRows[2]} placement={3} />
              ) : <div />}
            </div>
          ) : snapshot.rows.length > 0 ? (
            <section
              className="divide-y overflow-hidden rounded-2xl border bg-card"
              aria-label="Final leaderboard standings"
            >
              {snapshot.rows.map((row) => (
                <div
                  key={row.participantId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 text-sm sm:px-5 sm:text-base",
                    row.isViewer && "bg-primary/5",
                  )}
                >
                  <span className="w-9 font-black tabular-nums text-foreground">
                    #{row.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
                    {row.displayName}
                    {row.isViewer ? " (You)" : ""}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-foreground">
                    {formatScore(row.score)} XP
                  </span>
                </div>
              ))}
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              No ranked finishers yet.
            </p>
          )}

          {showPodium && !viewerInTopThree ? (
            <FinalViewerStanding row={snapshot.viewer} />
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/70 px-5 py-4 sm:px-8" showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export function LeaderboardOverlays({
  code,
  sessionId,
  participantId,
}: LeaderboardOverlaysProps) {
  const [payload, setPayload] = useState<LeaderboardPayload | null>(null);
  const [chipExpanded, setChipExpanded] = useState(false);
  const [rankUpdate, setRankUpdate] = useState<RankUpdate | null>(null);
  const [revealSnapshot, setRevealSnapshot] =
    useState<LeaderboardPayload | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const chipButtonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(false);
  const requestNumberRef = useRef(0);

  const loadLeaderboard =
    useCallback(async (
      decisionId?: string,
      revealFinalNames = false,
    ): Promise<LeaderboardPayload | null> => {
      const requestNumber = ++requestNumberRef.current;
      const searchParams = new URLSearchParams({ participantId });
      if (decisionId) searchParams.set("decisionId", decisionId);
      if (revealFinalNames) searchParams.set("reveal", "final");

      try {
        const response = await fetch(
          `/api/play/session/${encodeURIComponent(code)}/leaderboard?${searchParams.toString()}`,
          {
            cache: "no-store",
            headers: { Accept: "application/json" },
          },
        );

        if (!response.ok) return null;

        const nextPayload = (await response.json()) as LeaderboardPayload;
        if (
          mountedRef.current &&
          requestNumber === requestNumberRef.current
        ) {
          setPayload(nextPayload);
        }
        return nextPayload;
      } catch {
        return null;
      }
    }, [code, participantId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLeaderboard();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadLeaderboard]);

  useEffect(() => {
    const supabase = createClient();
    const refetch = () => {
      void loadLeaderboard(undefined, Boolean(revealSnapshot));
    };
    const filter = `session_id=eq.${sessionId}`;
    const channel = supabase
      .channel(`student-leaderboard-${sessionId}-${participantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "responses", filter },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "responses", filter },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        refetch,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadLeaderboard, participantId, revealSnapshot, sessionId]);

  // An individual run is compared with completions from separate sessions, so
  // its changes cannot be covered by a single session-scoped realtime filter.
  // Refreshing keeps the open rank card and podium current without caching it.
  useEffect(() => {
    if (payload?.scope !== "individual") return;

    const intervalId = window.setInterval(() => {
      void loadLeaderboard(undefined, Boolean(revealSnapshot));
    }, 5_000);
    return () => window.clearInterval(intervalId);
  }, [loadLeaderboard, payload?.scope, revealSnapshot]);

  useEffect(() => {
    const handleDecisionConsequence = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDecisionConsequenceDetail(detail)) return;

      void (async () => {
        const currentPayload = await loadLeaderboard(
          detail.decisionId,
          detail.isFinal,
        );
        if (
          !mountedRef.current ||
          !currentPayload?.settings.leaderboardEnabled
        ) {
          return;
        }

        if (detail.isFinal) {
          setRankUpdate(null);
          setRevealSnapshot(copyPayload(currentPayload));
          return;
        }

        setRankUpdate({
          decisionId: detail.decisionId,
          isFinal: detail.isFinal,
          snapshot: copyPayload(currentPayload),
        });
      })();
    };

    window.addEventListener(
      "praxis:decision-consequence",
      handleDecisionConsequence,
    );
    return () => {
      window.removeEventListener(
        "praxis:decision-consequence",
        handleDecisionConsequence,
      );
    };
  }, [loadLeaderboard]);

  useEffect(() => {
    if (!payload) return;

    setRevealSnapshot((current) => {
      if (!current) return current;
      if (!payload.settings.leaderboardEnabled) {
        return null;
      }
      return copyPayload(payload);
    });
  }, [payload]);

  useEffect(() => {
    if (payload?.settings.leaderboardEnabled !== false) return;
    setChipExpanded(false);
    setRankUpdate(null);
    setRevealSnapshot(null);
  }, [payload?.settings.leaderboardEnabled]);

  useEffect(() => {
    if (!chipExpanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !chipRef.current?.contains(event.target)
      ) {
        setChipExpanded(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setChipExpanded(false);
      chipButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [chipExpanded]);

  const dismissRankUpdate = useCallback(() => {
    if (!rankUpdate) return;
    setRankUpdate(null);
  }, [rankUpdate]);

  useEffect(() => {
    if (!rankUpdate) return;

    const timeoutId = window.setTimeout(dismissRankUpdate, 18_000);
    return () => window.clearTimeout(timeoutId);
  }, [dismissRankUpdate, rankUpdate]);

  if (!payload?.settings.leaderboardEnabled) return null;

  const viewer = payload.viewer;
  const viewerHasRank =
    viewer.rank !== null && viewer.completedDecisions > 0;
  const rankUpdateViewer = rankUpdate?.snapshot.viewer ?? null;
  const latestDecision = rankUpdate?.snapshot.latestDecision ?? null;

  return (
    <>
      {payload.settings.rankChipEnabled ? (
        <div
          ref={chipRef}
          className="fixed left-3 top-3 z-40 flex flex-col items-start sm:left-4 sm:top-4"
        >
          <button
            ref={chipButtonRef}
            type="button"
            className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-4 text-sm font-semibold text-card-foreground shadow-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={
              chipExpanded ? "Hide my leaderboard rank" : "Show my leaderboard rank"
            }
            aria-expanded={chipExpanded}
            aria-controls="student-rank-chip-details"
            onClick={() => setChipExpanded((expanded) => !expanded)}
          >
            <Trophy className="h-6 w-6 text-primary" aria-hidden />
            <span>{chipExpanded ? "Hide Your Rank" : "View Your Rank"}</span>
          </button>

          {chipExpanded ? (
            <section
              id="student-rank-chip-details"
              className="mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl"
              aria-label="Your leaderboard standing"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your standing
              </p>
              {viewerHasRank ? (
                <>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-2xl font-bold text-foreground">
                      #{viewer.rank}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatScore(viewer.score)} weighted XP
                    </p>
                  </div>
                  {viewer.percentileLabel ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {viewer.percentileLabel}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mt-2 font-semibold text-foreground">
                    Complete a decision to earn a rank
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {viewer.completedDecisions} of {viewer.totalDecisions}{" "}
                    decisions complete
                  </p>
                </>
              )}
            </section>
          ) : null}
        </div>
      ) : null}

      {rankUpdate && rankUpdateViewer ? (
        <aside
          className="pointer-events-none fixed inset-x-3 bottom-4 z-50 mx-auto max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-300 motion-reduce:animate-none sm:bottom-6"
          aria-live="polite"
        >
          <button
            type="button"
            className="pointer-events-auto block w-full rounded-2xl border border-border bg-card p-5 text-left text-card-foreground shadow-2xl transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={dismissRankUpdate}
            aria-label="Dismiss your leaderboard update"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
                Your rank update
              </span>
              <span className="text-xs text-muted-foreground">
                Tap to dismiss
              </span>
            </span>

            <span className="mt-4 flex items-end justify-between gap-4">
              <span className="block">
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                  Current rank
                </span>
                <span className="mt-1 block text-3xl font-bold text-foreground">
                  {rankUpdateViewer.rank === null
                    ? "Not ranked"
                    : `#${rankUpdateViewer.rank} of ${rankUpdate.snapshot.rows.length}`}
                </span>
              </span>
              <span className="block text-right">
                <span className="block text-xs text-muted-foreground">
                  Weighted score
                </span>
                <span className="mt-1 block font-semibold text-foreground">
                  {formatScore(rankUpdateViewer.score)} XP
                </span>
              </span>
            </span>

            <span className="mt-4 flex flex-wrap items-center gap-2">
              {latestDecision ? (
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                    TIER_STYLES[latestDecision.tier],
                  )}
                >
                  {latestDecision.tier} · +{latestDecision.xp} XP
                </span>
              ) : null}
              {rankUpdateViewer.completedDecisions === 0 ? (
                <span className="text-sm text-muted-foreground">
                  {rankUpdateViewer.completedDecisions} of{" "}
                  {rankUpdateViewer.totalDecisions} decisions complete
                </span>
              ) : rankUpdateViewer.percentileLabel ? (
                <span className="text-sm text-muted-foreground">
                  {rankUpdateViewer.percentileLabel}
                </span>
              ) : null}
            </span>

            <span className="mt-4 block border-t border-border pt-3 text-sm text-muted-foreground">
              {rankUpdateViewer.rank === 1
                ? `You're leading the ${rankUpdate.snapshot.scopeLabel}.`
                : rankUpdate.snapshot.tieInfo?.tieBreakReason
                  ? `You are 0 XP behind ${rankUpdate.snapshot.tieInfo.tieBreakAboveName ?? "the student above"} and have the same completion-weighted score, but ${rankUpdate.snapshot.tieInfo.tieBreakAboveName ?? "they"} is ranked ahead because ${tieBreakExplanation(rankUpdate.snapshot.tieInfo.tieBreakReason)}. ${playersAheadMessage(rankUpdate.snapshot.tieInfo.playersAhead)}`
                  : rankUpdate.snapshot.above
                    ? `You are ${formatScore(rankUpdate.snapshot.above.gapXp)} XP behind ${rankUpdate.snapshot.above.displayName}. ${playersAheadMessage(rankUpdate.snapshot.tieInfo.playersAhead)}`
                    : rankUpdateViewer.rank === null
                      ? "Complete a decision to join the rankings."
                      : playersAheadMessage(rankUpdate.snapshot.tieInfo.playersAhead)}
            </span>
            {rankUpdate.snapshot.tieInfo?.tiedCount &&
            rankUpdate.snapshot.tieInfo.tiedCount > 0 ? (
              <span className="mt-2 block text-sm text-muted-foreground">
                You're tied with{" "}
                {rankUpdate.snapshot.tieInfo.tiedNames.length === 1
                  ? `${rankUpdate.snapshot.tieInfo.tiedNames[0]}`
                  : `${rankUpdate.snapshot.tieInfo.tiedNames.slice(0, -1).join(", ")} and ${rankUpdate.snapshot.tieInfo.tiedNames[rankUpdate.snapshot.tieInfo.tiedNames.length - 1]}`}
                .
              </span>
            ) : null}
          </button>
        </aside>
      ) : null}

      {revealSnapshot ? (
        <EndLeaderboardReveal
          snapshot={revealSnapshot}
          onClose={() => setRevealSnapshot(null)}
        />
      ) : null}
    </>
  );
}
