export type DecisionQuality = "strong" | "partial" | "weak";

export function decisionQualityFromScore(
  score: number | null | undefined,
  maxScore = 3,
): DecisionQuality {
  if (maxScore <= 0) return "weak";
  const ratio = (score ?? 0) / maxScore;
  if (ratio >= 0.8) return "strong";
  if (ratio >= 0.5) return "partial";
  return "weak";
}

export function decisionQualityLabel(quality: DecisionQuality): string {
  if (quality === "strong") return "Strong";
  if (quality === "partial") return "Partially correct";
  return "Weak";
}

export function scorePercent(totalScore: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((totalScore / maxScore) * 100);
}

/**
 * XP values for each outcome tier.
 * Poor = 25 XP, Decent = 50 XP, Good = 75 XP, Perfect = 100 XP
 */
export const XP_TIERS = {
  poor: 25,
  decent: 50,
  good: 75,
  perfect: 100,
} as const;

export type XpTier = keyof typeof XP_TIERS;

/**
 * Maps an outcome rating string to an XP value.
 * Accepts "excellent", "decent", "poor", "strong", "mixed", or a score number.
 */
export function outcomeToXp(
  outcomeRating: string | null | undefined,
  score?: number | null,
): number {
  if (!outcomeRating && (score == null)) return 0;
  
  const rating = (outcomeRating ?? "").toLowerCase();
  
  if (rating === "excellent" || rating === "perfect" || rating === "strong") {
    return XP_TIERS.perfect;
  }
  if (rating === "good") {
    return XP_TIERS.good;
  }
  if (rating === "decent") {
    return XP_TIERS.decent;
  }
  if (rating === "poor" || rating === "weak" || rating === "mixed") {
    return XP_TIERS.poor;
  }
  
  // Fall back to score-based calculation
  if (score != null) {
    if (score >= 3) return XP_TIERS.perfect;
    if (score >= 2) return XP_TIERS.good;
    if (score >= 1) return XP_TIERS.decent;
    return XP_TIERS.poor;
  }
  
  return 0;
}

/**
 * Returns the XP tier label for a given XP value.
 */
export function xpToTierLabel(xp: number): string {
  if (xp >= XP_TIERS.perfect) return "Perfect";
  if (xp >= XP_TIERS.good) return "Good";
  if (xp >= XP_TIERS.decent) return "Decent";
  return "Poor";
}

/**
 * Returns the CSS color class for a given XP tier.
 */
export function xpTierColor(tier: XpTier | string): string {
  switch (tier) {
    case "perfect":
      return "text-blue-600 dark:text-blue-400";
    case "good":
      return "text-emerald-600 dark:text-emerald-400";
    case "decent":
      return "text-amber-600 dark:text-amber-400";
    case "poor":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

/**
 * Returns the background color class for a given XP tier.
 */
export function xpTierBgColor(tier: XpTier | string): string {
  switch (tier) {
    case "perfect":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "good":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
    case "decent":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
    case "poor":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}
