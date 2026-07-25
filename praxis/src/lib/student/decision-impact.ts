export type ImpactDirection = "up" | "down" | "neutral";

export interface DecisionImpact {
  metric: string;
  value: number;
  unit: "currency" | "points" | "percent";
  direction: ImpactDirection;
  change: string;
  explanation: string;
  kind: "performance" | "financial";
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

function impact(
  metric: string,
  value: number,
  unit: DecisionImpact["unit"],
  explanation: string,
  kind: DecisionImpact["kind"] = "performance",
): DecisionImpact {
  const rounded = Math.round(value * 10) / 10;
  return {
    metric,
    value: rounded,
    unit,
    direction: rounded > 0 ? "up" : rounded < 0 ? "down" : "neutral",
    change: formatImpact(metric, rounded, unit),
    explanation,
    kind,
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

function scenarioMetrics(context: string): [string, string, string, string] {
  const normalized = context.toLowerCase();
  if (/(history|historical|archive|primary source|museum|heritage)/.test(normalized)) {
    return ["Historical Evidence", "Public Understanding", "Preservation Feasibility", "Resource Impact"];
  }
  if (/(patient|hospital|health|clinical|medical|care)/.test(normalized)) {
    return ["Patient Outcomes", "Access to Care", "Operational Capacity", "Cost Impact"];
  }
  if (/(student|school|education|learning|classroom|university)/.test(normalized)) {
    return ["Learner Engagement", "Equitable Access", "Program Scalability", "Resource Impact"];
  }
  if (/(campaign|marketing|customer|brand|audience|advertis)/.test(normalized)) {
    return ["Audience Engagement", "Market Reach", "Scalability", "Cost Impact"];
  }
  if (/(finance|revenue|investment|bank|budget|profit|pricing)/.test(normalized)) {
    return ["Financial Performance", "Stakeholder Confidence", "Risk Resilience", "Cost Impact"];
  }
  if (/(policy|government|public|community|civic)/.test(normalized)) {
    return ["Community Benefit", "Public Trust", "Implementation Feasibility", "Resource Impact"];
  }
  return ["Decision Effectiveness", "Stakeholder Support", "Implementation Feasibility", "Resource Impact"];
}

export function calculateDecisionImpact(
  option: ImpactOption,
  decisionNumber: number,
  scenarioContext = "",
): DecisionImpact[] {
  const quality = Math.max(0, Math.min(4, option.score));
  const variant = stableVariant(option, decisionNumber);
  const [primary, secondary, tradeoff, financial] = scenarioMetrics(
    `${scenarioContext} ${option.title} ${option.description ?? ""}`,
  );
  const primaryValue = Math.round((quality - 1.6) * 11 + variant * 0.8);
  const secondaryValue = Math.round((quality - 1.9) * 7 + variant * 0.5);
  const tradeoffValue = Math.round((quality - 2.35) * 6 - Math.abs(variant) * 0.5);
  const resourceValue =
    -Math.round((1100 + decisionNumber * 450 + Math.abs(variant) * 175) / 50) * 50;
  const choice = option.title.trim() || `Option ${option.label}`;

  return [
    impact(
      primary,
      primaryValue,
      "percent",
      `${choice} most directly changed ${primary.toLowerCase()} by ${formatImpact(primary, primaryValue, "percent")}.`,
    ),
    impact(
      secondary,
      secondaryValue,
      "points",
      `The approach shifted ${secondary.toLowerCase()} as stakeholders responded to the selected strategy.`,
    ),
    impact(
      tradeoff,
      tradeoffValue,
      "percent",
      `The main trade-off appeared in ${tradeoff.toLowerCase()}, reflecting the constraints described in this case.`,
    ),
    impact(
      financial,
      resourceValue,
      "currency",
      `Estimated resources committed to this choice were ${formatImpact(financial, Math.abs(resourceValue), "currency").replace("+", "")}.`,
      "financial",
    ),
  ];
}

export function accumulateImpacts(
  totals: DecisionImpact[],
  delta: DecisionImpact[],
): DecisionImpact[] {
  return delta.map((item) => {
    const previous = totals.find((total) => total.metric === item.metric);
    return impact(
      item.metric,
      (previous?.value ?? 0) + item.value,
      item.unit,
      item.explanation,
      item.kind,
    );
  });
}
