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
