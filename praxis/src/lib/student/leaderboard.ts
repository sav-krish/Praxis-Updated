export const LEADERBOARD_XP = {
  Perfect: 100,
  Good: 75,
  Decent: 50,
  Poor: 25,
} as const;

export type LeaderboardTier = keyof typeof LEADERBOARD_XP;

export const LEADERBOARD_TIERS = (
  Object.entries(LEADERBOARD_XP) as Array<[LeaderboardTier, number]>
).map(([tier, xp]) => ({ tier, xp }));

export type LeaderboardMetrics = {
  completedDecisions: number;
  totalDecisions: number;
  averageXp: number | null;
  score: number;
  perfectCount: number;
};

export type LeaderboardSortableRow = {
  participantId: string;
  completedDecisions: number;
  averageXp: number | null;
  score: number;
  perfectCount: number;
};

export type TieBreakReason =
  | "higher raw average XP"
  | "more decisions completed"
  | "more Perfect outcomes";

/**
 * Existing simulations use integer option scores from 1–3. A half-step is
 * reserved for the Good tier so it can be introduced without changing XP.
 */
export function optionScoreToTier(
  score: number | null | undefined,
): LeaderboardTier {
  if (!Number.isFinite(score)) return "Poor";
  if ((score as number) >= 3) return "Perfect";
  if ((score as number) >= 2.5) return "Good";
  if ((score as number) >= 2) return "Decent";
  return "Poor";
}

export function tierToXp(tier: LeaderboardTier): number {
  return LEADERBOARD_XP[tier];
}

export function optionScoreToXp(score: number | null | undefined): number {
  return tierToXp(optionScoreToTier(score));
}

export function calculateCompletionWeightedScore(
  averageXp: number | null,
  completedDecisions: number,
  totalDecisions: number,
): number {
  if (
    averageXp === null ||
    !Number.isFinite(averageXp) ||
    completedDecisions <= 0 ||
    totalDecisions <= 0
  ) {
    return 0;
  }

  const completionFraction = Math.min(
    1,
    Math.max(0, completedDecisions / totalDecisions),
  );
  return averageXp * Math.sqrt(completionFraction);
}

export function calculateLeaderboardMetrics(
  xpValues: readonly number[],
  totalDecisions: number,
): LeaderboardMetrics {
  const validXpValues = xpValues.filter(
    (xp) => Number.isFinite(xp) && xp >= 0,
  );
  const normalizedTotal = Math.max(0, Math.trunc(totalDecisions));
  const completedDecisions = Math.min(
    normalizedTotal,
    validXpValues.length,
  );
  const usedXpValues = validXpValues.slice(0, completedDecisions);
  const averageXp =
    completedDecisions > 0
      ? usedXpValues.reduce((sum, xp) => sum + xp, 0) / completedDecisions
      : null;
  const perfectCount = usedXpValues.filter(
    (xp) => xp >= LEADERBOARD_XP.Perfect,
  ).length;

  return {
    completedDecisions,
    totalDecisions: normalizedTotal,
    averageXp,
    score: calculateCompletionWeightedScore(
      averageXp,
      completedDecisions,
      normalizedTotal,
    ),
    perfectCount,
  };
}

function compareParticipantIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function compareLeaderboardRows(
  left: LeaderboardSortableRow,
  right: LeaderboardSortableRow,
): number {
  if (left.score !== right.score) return right.score - left.score;

  const leftAverage = left.averageXp ?? Number.NEGATIVE_INFINITY;
  const rightAverage = right.averageXp ?? Number.NEGATIVE_INFINITY;
  if (leftAverage !== rightAverage) return rightAverage - leftAverage;

  if (left.completedDecisions !== right.completedDecisions) {
    return right.completedDecisions - left.completedDecisions;
  }

  if (left.perfectCount !== right.perfectCount) {
    return right.perfectCount - left.perfectCount;
  }

  return compareParticipantIds(left.participantId, right.participantId);
}

/**
 * Returns true when two rows are identical across all ranking criteria
 * (score, averageXp, completedDecisions, perfectCount). Such rows share
 * the same rank.
 */
export function isFullyTied(
  left: LeaderboardSortableRow,
  right: LeaderboardSortableRow,
): boolean {
  return (
    left.score === right.score &&
    (left.averageXp ?? Number.NEGATIVE_INFINITY) ===
      (right.averageXp ?? Number.NEGATIVE_INFINITY) &&
    left.completedDecisions === right.completedDecisions &&
    left.perfectCount === right.perfectCount
  );
}

/**
 * When two rows share the same completion-weighted score but are NOT fully
 * tied, this returns the reason the `higher` row is ranked above the `lower`
 * row. Returns null when the rows are fully tied or have different scores.
 */
export function tieBreakReason(
  higher: LeaderboardSortableRow,
  lower: LeaderboardSortableRow,
): TieBreakReason | null {
  if (higher.score !== lower.score) return null;

  const higherAvg = higher.averageXp ?? Number.NEGATIVE_INFINITY;
  const lowerAvg = lower.averageXp ?? Number.NEGATIVE_INFINITY;
  if (higherAvg > lowerAvg) return "higher raw average XP";

  if (higher.completedDecisions > lower.completedDecisions) {
    return "more decisions completed";
  }

  if (higher.perfectCount > lower.perfectCount) {
    return "more Perfect outcomes";
  }

  return null;
}

export function sortLeaderboardRows<T extends LeaderboardSortableRow>(
  rows: readonly T[],
): T[] {
  return [...rows].sort(compareLeaderboardRows);
}

export function assignLeaderboardRanks<T extends LeaderboardSortableRow>(
  rows: readonly T[],
): Array<T & { rank: number | null }> {
  const sorted = sortLeaderboardRows(rows);
  let rank = 0;
  let prevRanked: T | null = null;
  let rankedCount = 0;

  return sorted.map((row) => {
    if (row.completedDecisions <= 0) {
      return { ...row, rank: null };
    }

    rankedCount++;

    if (prevRanked === null || !isFullyTied(prevRanked, row)) {
      rank = rankedCount;
    }

    prevRanked = row;
    return { ...row, rank };
  });
}

export function rankForParticipant(
  rows: readonly (LeaderboardSortableRow & { rank: number | null })[],
  participantId: string,
): number | null {
  return rows.find((row) => row.participantId === participantId)?.rank ?? null;
}

/**
 * Returns the displayed "top X%" value. Rank 1 is clamped to 1%, and a
 * one-person leaderboard has no meaningful percentile.
 */
export function percentileForRank(
  rank: number | null,
  rankedParticipantCount: number,
): number | null {
  if (
    rank === null ||
    rank < 1 ||
    rankedParticipantCount <= 1 ||
    rank > rankedParticipantCount
  ) {
    return null;
  }

  return Math.max(
    1,
    Math.round(((rank - 1) / rankedParticipantCount) * 100),
  );
}

export function percentileLabel(
  rank: number | null,
  rankedParticipantCount: number,
  scopeLabel: string,
): string | null {
  const percentile = percentileForRank(rank, rankedParticipantCount);
  return percentile === null
    ? null
    : `Top ${percentile}% of ${scopeLabel}`;
}
