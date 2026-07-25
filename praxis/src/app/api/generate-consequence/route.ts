import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateStructured } from "@/lib/openai-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  scenarioTitle: z.string().min(1),
  scenarioContext: z.string().nullable().optional(),
  decisionPrompt: z.string().min(1),
  optionLabel: z.string().nullable().optional(),
  optionTitle: z.string().nullable().optional(),
  optionDescription: z.string().nullable().optional(),
  justification: z.string().optional(),
  roleLabel: z.string().nullable().optional(),
});

const ConsequenceSchema = z.object({
  consequence: z.string(),
  outcomeRating: z.enum(["strong", "decent", "mixed", "poor"]),
  feedback: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const input = RequestSchema.parse(await request.json());
    const result = await generateStructured({
      system:
        "You evaluate student decisions in a classroom simulation. Produce a realistic short-term consequence and concise feedback on the student's reasoning. Respect tradeoffs and the student's role. Never claim certainty beyond the scenario.",
      user: `Scenario: ${input.scenarioTitle}
Context: ${(input.scenarioContext || "").slice(0, 5000)}
Role: ${input.roleLabel || "Decision maker"}
Decision: ${input.decisionPrompt}
Choice: ${input.optionLabel || ""}. ${input.optionTitle || ""}
Choice details: ${input.optionDescription || ""}
Student reasoning: ${input.justification || "No reasoning supplied"}`,
      schema: ConsequenceSchema,
      temperature: 0.45,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate consequence" },
      { status: 500 },
    );
  }
}
