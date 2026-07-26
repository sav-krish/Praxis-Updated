import {
  decisionQualityFromScore,
  decisionQualityLabel,
  type DecisionQuality,
} from "./scoring";

export type DecisionExplanation = {
  decisionId: string;
  orderNum: number;
  prompt: string;
  selectedOptionId: string | null;
  selectedLabel: string | null;
  selectedTitle: string | null;
  score: number;
  maxScore: number;
  quality: DecisionQuality;
  qualityLabel: string;
  explanation: string;
  consequence: string | null;
};

type OptionRow = {
  id: string;
  label: string;
  title: string;
  description: string | null;
  consequence: string | null;
  score: number;
};

type DecisionRow = {
  id: string;
  order_num: number;
  prompt: string;
  options: OptionRow[];
};

type ResponseRow = {
  decision_id: string;
  option_id: string;
};

function explanationText(
  quality: DecisionQuality,
  consequence: string | null,
  selectedTitle: string | null
): string {
  if (consequence?.trim()) return consequence.trim();

  if (quality === "strong") {
    return `Strong choice. "${selectedTitle ?? "This option"}" aligns well with the scenario objectives.`;
  }
  if (quality === "partial") {
    return `"${selectedTitle ?? "This option"}" captures part of the answer but misses important tradeoffs.`;
  }
  return `"${selectedTitle ?? "This option"}" overlooks key constraints in this scenario. Consider alternatives that balance stakeholder impact.`;
}

export function buildDecisionExplanations(
  decisions: DecisionRow[],
  responses: ResponseRow[]
): DecisionExplanation[] {
  return decisions.map((decision) => {
    const response = responses.find((r) => r.decision_id === decision.id);
    const selected = decision.options.find((o) => o.id === response?.option_id) ?? null;
    const score = selected?.score ?? 0;
    const maxScore = Math.max(
      0,
      ...decision.options.map((option) => option.score ?? 0),
    );
    const quality = decisionQualityFromScore(score, maxScore);

    return {
      decisionId: decision.id,
      orderNum: decision.order_num,
      prompt: decision.prompt,
      selectedOptionId: selected?.id ?? null,
      selectedLabel: selected?.label ?? null,
      selectedTitle: selected?.title ?? null,
      score,
      maxScore,
      quality,
      qualityLabel: decisionQualityLabel(quality),
      explanation: explanationText(quality, selected?.consequence ?? null, selected?.title ?? null),
      consequence: selected?.consequence ?? null,
    };
  });
}
