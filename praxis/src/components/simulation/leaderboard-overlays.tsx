"use client";

import { Medal, TrendingUp, Trophy } from "lucide-react";
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

type SimulationCompleteDetail = {
  sessionId: string;
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

const PODIUM_STYLES = [
  "border-amber-300 bg-amber-50/80 dark:border-amber-700 dark:bg-amber-950/40",
  "border-slate-300 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-900/60",
  "border-orange-300 bg-orange-50/80 dark:border-orange-800 dark:bg-orange-950/40",
] as const;

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

function isSimulationCompleteDetail(
  detail: unknown,
): detail is SimulationCompleteDetail {
  if (!detail || typeof detail !== "object") return false;

  const candidate = detail as Partial<SimulationCompleteDetail>;
  return typeof candidate.sessionId === "string" && candidate.sessionId.length > 0;
}

function percentileText(row: LeaderboardRow): string | null {
  return row.percentileLabel;
}

function PodiumStanding({
  row,
  index,
}: {
  row: LeaderboardRow;
  index: number;
}) {
  const placementIndex = Math.max(0, Math.min(2, (row.rank ?? 1) - 1));

  return (
    <article
      className={cn(
        "flex min-w-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-3 flex-col rounded-xl border p-4 text-left duration-500 motion-reduce:animate-none",
        PODIUM_STYLES[placementIndex],
      )}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Medal className="h-4 w-4" aria-hidden />
          {row.rank === null ? "Not ranked" : `#${row.rank}`}
        </span>
        {row.isViewer ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-primary-foreground">
            YOU
          </span>
        ) : null}
      </div>
      <p className="mt-3 truncate font-medium text-card-foreground">
        {row.displayName}
      </p>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Decisions</dt>
          <dd className="font-medium text-foreground">
            {row.completedDecisions}/{row.totalDecisions}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Weighted score</dt>
          <dd className="font-medium text-foreground">
            {formatScore(row.score)} XP
          </dd>
        </div>
      </dl>
      {percentileText(row) ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {percentileText(row)}
        </p>
      ) : null}
    </article>
  );
}

function EndLeaderboardReveal({
  snapshot,
  onClose,
}: {
  snapshot: LeaderboardPayload;
  onClose: () => void;
}) {
  const podiumRows = snapshot.topThree.slice(0, 3);
  const viewerInTopThree = podiumRows.some(
    (row) => row.participantId === snapshot.viewer.participantId,
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl sm:justify-start">
            <Trophy className="h-5 w-5 text-primary" aria-hidden />
            Final leaderboard
          </DialogTitle>
          <DialogDescription>
            Your completion-weighted result compared with the{" "}
            {snapshot.scopeLabel}.
          </DialogDescription>
        </DialogHeader>

        {podiumRows.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            {podiumRows.map((row, index) => (
              <PodiumStanding key={row.participantId} row={row} index={index} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center text-sm text-muted-foreground">
            No ranked finishers yet.
          </p>
        )}

        {!viewerInTopThree ? (
          <section
            className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-xl border border-primary/30 bg-primary/5 p-4 duration-500 motion-reduce:animate-none"
            aria-label="Your final standing"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Your result
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {snapshot.viewer.rank === null
                    ? "Not ranked yet"
                    : `#${snapshot.viewer.rank}`}
                </p>
              </div>
              <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                YOU
              </span>
            </div>
            <div
              className={cn(
                "mt-4 grid grid-cols-1 gap-2 text-sm",
                snapshot.viewer.percentileLabel ? "sm:grid-cols-3" : "sm:grid-cols-2",
              )}
            >
              <p className="rounded-lg bg-background/80 p-3 text-foreground">
                <span className="block text-xs text-muted-foreground">
                  Decisions
                </span>
                {snapshot.viewer.completedDecisions}/
                {snapshot.viewer.totalDecisions}
              </p>
              <p className="rounded-lg bg-background/80 p-3 text-foreground">
                <span className="block text-xs text-muted-foreground">
                  Weighted score
                </span>
                {formatScore(snapshot.viewer.score)} XP
              </p>
              {snapshot.viewer.percentileLabel ? (
                <p className="rounded-lg bg-background/80 p-3 text-foreground">
                  <span className="block text-xs text-muted-foreground">
                    Percentile
                  </span>
                  {snapshot.viewer.percentileLabel}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <DialogFooter showCloseButton />
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
  const completedSessionRef = useRef<string | null>(null);

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
    const handleSimulationComplete = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (
        !isSimulationCompleteDetail(detail) ||
        detail.sessionId !== sessionId ||
        completedSessionRef.current === sessionId
      ) {
        return;
      }
      completedSessionRef.current = sessionId;

      void (async () => {
        const snapshot = await loadLeaderboard(undefined, true);
        if (
          !mountedRef.current ||
          !snapshot?.settings.canShowPodium
        ) {
          return;
        }

        setRankUpdate(null);
        setRevealSnapshot(copyPayload(snapshot));
      })();
    };

    window.addEventListener("praxis:simulation-complete", handleSimulationComplete);
    return () => {
      window.removeEventListener(
        "praxis:simulation-complete",
        handleSimulationComplete,
      );
    };
  }, [loadLeaderboard, sessionId]);

  useEffect(() => {
    if (!payload) return;

    setRevealSnapshot((current) => {
      if (!current) return current;
      if (!payload.settings.canShowPodium) {
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

    if (rankUpdate.isFinal && rankUpdate.snapshot.settings.canShowPodium) {
      setRevealSnapshot(copyPayload(rankUpdate.snapshot));
    }
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
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-card-foreground shadow-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={
              chipExpanded ? "Hide my leaderboard rank" : "Show my leaderboard rank"
            }
            aria-expanded={chipExpanded}
            aria-controls="student-rank-chip-details"
            onClick={() => setChipExpanded((expanded) => !expanded)}
          >
            <Trophy className="h-5 w-5 text-primary" aria-hidden />
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
