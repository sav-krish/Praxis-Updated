export type ImpactDirection = "up" | "down" | "neutral";

export interface DecisionImpact {
  metric: string;
  value: number;
  unit: "currency" | "points" | "percent";
  direction: ImpactDirection;
  change: string;
}

interface ImpactOption {
  id: string;
  label: string;
  title: string;
  description?: string | null;
  score: number;
}

const compactMoney = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatImpact(metric: string, value: number, unit: DecisionImpact["unit"]) {
  if (unit === "currency") {
    const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${prefix}$${compactMoney.format(Math.abs(value))}`;
  }
  if (unit === "points") return `${signed(value)} pts`;
  return `${signed(value)}%`;
}

function impact(metric: string, value: number, unit: DecisionImpact["unit"]): DecisionImpact {
  const rounded = Math.round(value * 10) / 10;
  return {
    metric,
    value: rounded,
    unit,
    direction: rounded > 0 ? "up" : rounded < 0 ? "down" : "neutral",
    change: formatImpact(metric, rounded, unit),
  };
}

function stableVariant(option: ImpactOption, decisionNumber: number) {
  const source = `${option.id}:${option.label}:${option.title}:${option.description ?? ""}:${decisionNumber}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0;
  }
  return Math.abs(hash % 7) - 3;
}

export function calculateDecisionImpact(option: ImpactOption, decisionNumber: number): DecisionImpact[] {
  const quality = Math.max(0, Math.min(4, option.score));
  const variant = stableVariant(option, decisionNumber);
  const position = Math.max(1, decisionNumber);

  const revenue = (quality - 1.7) * 540_000 + variant * 42_000 + position * 65_000;
  const nps = Math.round((quality - 1.8) * 5 + variant * 0.7);
  const retention = Math.round(((quality - 2) * 2.4 - variant * 0.35) * 10) / 10;

  return [
    impact("Revenue", Math.round(revenue / 10_000) * 10_000, "currency"),
    impact("NPS", nps, "points"),
    impact("Retention", retention, "percent"),
  ];
}

export function accumulateImpacts(
  totals: DecisionImpact[],
  delta: DecisionImpact[],
): DecisionImpact[] {
  return delta.map((item) => {
    const previous = totals.find((total) => total.metric === item.metric);
    return impact(item.metric, (previous?.value ?? 0) + item.value, item.unit);
  });
}
