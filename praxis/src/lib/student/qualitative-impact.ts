export type QualitativeDirection = "up" | "neutral" | "down" | "cost";

export interface QualitativeImpact {
  label: string;
  direction: QualitativeDirection;
  description: string;
  reason: string;
}

interface ImpactOption {
  label: string;
  title: string;
  description?: string | null;
  score: number;
}

function scenarioLabels(context: string): [string, string, string, string] {
  const text = context.toLowerCase();
  if (/(history|historical|archive|primary source|museum|heritage)/.test(text)) {
    return ["Evidence Quality", "Public Understanding", "Preservation", "Time and Effort"];
  }
  if (/\b(patient|hospital|health|healthcare|clinical|medical)\b|care delivery/.test(text)) {
    return ["Patient Care", "Access to Help", "Staff Workload", "Time and Cost"];
  }
  if (
    /\b(engineer|engineering|organization|workforce|employee|talent|hiring|hr|restructuring|mobility)\b|role clarity/.test(
      text,
    )
  ) {
    return ["Role Clarity", "Change Speed", "Skill Fit", "Time and Effort"];
  }
  if (/(student|school|education|learning|classroom|university)/.test(text)) {
    return ["Student Interest", "Fair Access", "Teacher Workload", "Time and Effort"];
  }
  if (/(campaign|marketing|customer|brand|audience|advertis)/.test(text)) {
    return ["Customer Interest", "Audience Reach", "Team Confidence", "Time and Effort"];
  }
  if (/(finance|revenue|investment|bank|budget|profit|pricing)/.test(text)) {
    return ["Financial Health", "Customer Confidence", "Risk", "Time and Cost"];
  }
  if (/(policy|government|public|community|civic)/.test(text)) {
    return ["Community Benefit", "Public Trust", "Ease of Rollout", "Time and Effort"];
  }
  return ["Decision Clarity", "People's Support", "Ease of Rollout", "Time and Effort"];
}

function description(label: string, direction: QualitativeDirection) {
  if (direction === "up") return `${label} improved.`;
  if (direction === "down") return `${label} became weaker.`;
  if (direction === "neutral") return `${label} stayed mixed.`;
  return `${label} became more demanding.`;
}

export function calculateQualitativeImpact(
  option: ImpactOption,
  scenarioContext = "",
): QualitativeImpact[] {
  const [first, second, third, fourth] = scenarioLabels(
    `${scenarioContext} ${option.title} ${option.description ?? ""}`,
  );
  const quality = Math.max(0, Math.min(3, option.score));
  const directions: QualitativeDirection[] =
    quality >= 3
      ? ["up", "up", "neutral", "cost"]
      : quality >= 2.5
        ? ["up", "neutral", "neutral", "cost"]
      : quality === 2
        ? ["up", "neutral", "down", "cost"]
        : quality === 1
          ? ["neutral", "down", "down", "cost"]
          : ["down", "down", "down", "cost"];
  const labels = [first, second, third, fourth];
  const choice = option.title.trim() || `Option ${option.label}`;
  const reasons = [
    `${choice} directly addressed this part of the problem.`,
    `People could see some value in the choice, but not every concern was resolved.`,
    `The plan left an important part of the situation harder to manage.`,
    `The choice needed extra planning, coordination, and follow-through.`,
  ];

  return labels.map((label, index) => ({
    label,
    direction: directions[index],
    description: description(label, directions[index]),
    reason: reasons[index],
  }));
}
