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
};

export type LeaderboardSortableRow = {
  participantId: string;
  completedDecisions: number;
  averageXp: number | null;
  score: number;
};

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
  const averageXp =
    completedDecisions > 0
      ? validXpValues
          .slice(0, completedDecisions)
          .reduce((sum, xp) => sum + xp, 0) / completedDecisions
      : null;

  return {
    completedDecisions,
    totalDecisions: normalizedTotal,
    averageXp,
    score: calculateCompletionWeightedScore(
      averageXp,
      completedDecisions,
      normalizedTotal,
    ),
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

  return compareParticipantIds(left.participantId, right.participantId);
}

export function sortLeaderboardRows<T extends LeaderboardSortableRow>(
  rows: readonly T[],
): T[] {
  return [...rows].sort(compareLeaderboardRows);
}

export function assignLeaderboardRanks<T extends LeaderboardSortableRow>(
  rows: readonly T[],
): Array<T & { rank: number | null }> {
  let nextRank = 1;

  return sortLeaderboardRows(rows).map((row) => ({
    ...row,
    rank: row.completedDecisions > 0 ? nextRank++ : null,
  }));
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
