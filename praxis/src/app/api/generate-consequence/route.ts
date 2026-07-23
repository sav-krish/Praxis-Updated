import { NextRequest, NextResponse } from "next/server";
import { generateChatCompletion, getOpenAIModel } from "@/lib/openai-generate";

const CONSEQUENCE_SYSTEM_PROMPT = `You are a simulation engine for Praxis, an interactive classroom simulation platform.

Given a student's decision choice and their justification, generate a detailed, realistic consequence that explains:
1. WHAT happened as a result of their decision
2. WHY it happened (the causal chain)
3. The DIRECT real-world impact (metrics, team morale, customer sentiment, etc.)

## GUIDELINES:
- Write in second person ("You decided to...", "Your team...")
- Be specific and concrete — reference real metrics, timelines, and outcomes
- Connect the consequence back to the scenario context
- Keep it to 2-4 paragraphs
- Do NOT give away whether it was the "right" or "wrong" choice — let them infer from the outcome
- Sound like a realistic business case study outcome`;

function buildDataImpact(optionLabel: string, optionTitle: string) {
  const seed = (optionLabel + optionTitle).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pseudo = (seed * 9301 + 49297) % 233280;
  const r = () => (pseudo / 233280);

  const revenueBase = 1.2 + r() * 2.4;
  const revenueDirection: "up" | "down" | "neutral" = optionLabel === "A" ? "down" : optionLabel === "B" ? "neutral" : "up";
  const revenueSign = revenueDirection === "up" ? "+" : revenueDirection === "down" ? "-" : "+";

  const npsBase = Math.round(-6 + r() * 14);
  const npsDirection: "up" | "down" | "neutral" = npsBase >= 0 ? "up" : "down";
  const npsSign = npsBase >= 0 ? "+" : "";

  const retentionBase = parseFloat((-0.8 + r() * 2.1).toFixed(1));
  const retentionDirection: "up" | "down" | "neutral" = retentionBase >= 0 ? "up" : "down";
  const retentionSign = retentionBase >= 0 ? "+" : "";

  return [
    {
      metric: "Revenue",
      change: `${revenueSign}$${revenueBase.toFixed(1)}M`,
      direction: revenueDirection,
    },
    {
      metric: "NPS",
      change: `${npsSign}${npsBase}pts`,
      direction: npsDirection,
    },
    {
      metric: "Retention",
      change: `${retentionSign}${retentionBase > 0 ? "+" : ""}${retentionBase}%`,
      direction: retentionDirection,
    },
  ];
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "OpenAI is not configured." }, { status: 503 });
  }

  const { scenarioTitle, scenarioContext, decisionPrompt, optionLabel, optionTitle, optionDescription, justification, roleLabel } = await req.json();

  const userPrompt = `Simulation: "${scenarioTitle || "Unknown"}"
Scenario Context: "${scenarioContext || "No additional context provided."}"
Role: "${roleLabel || "No specific role"}"
Decision: "${decisionPrompt}"
Choice: ${optionLabel}. ${optionTitle}${optionDescription ? ` — ${optionDescription}` : ""}
${justification ? `Student's Justification: "${justification}"` : "No justification provided."}

Generate a detailed, realistic consequence for this decision.`;

  const message = await generateChatCompletion({
    system: CONSEQUENCE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    model: getOpenAIModel(),
    maxTokens: 600,
    temperature: 0.8,
  });

  const dataImpact = buildDataImpact(optionLabel, optionTitle);

  return NextResponse.json({ consequence: message, dataImpact });
}

export async function GET() {
  return NextResponse.json({ status: "ok" });
}