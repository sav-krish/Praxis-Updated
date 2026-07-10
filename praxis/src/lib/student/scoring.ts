export type DecisionQuality = "strong" | "partial" | "weak";

export function decisionQualityFromScore(score: number | null | undefined): DecisionQuality {
  if ((score ?? 0) >= 3) return "strong";
  if ((score ?? 0) === 2) return "partial";
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

