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

const PlainText = z
  .string()
  .min(1)
  .refine((value) => !/[\d%$]/.test(value), "Use qualitative language without numbers")
  .refine((value) => !/[—–]/.test(value), "Use plain punctuation without em dashes");

const ConsequenceSchema = z.object({
  consequence: PlainText,
  outcomeRating: z.enum(["excellent", "decent", "poor"]),
  outcomeReasoning: PlainText,
  feedback: PlainText,
  impacts: z
    .array(
      z.object({
        label: PlainText,
        direction: z.enum(["up", "neutral", "down", "cost"]),
        description: PlainText,
        reason: PlainText,
      }),
    )
    .length(4),
});

export async function POST(request: NextRequest) {
  try {
    const input = RequestSchema.parse(await request.json());
    const result = await generateStructured({
      system: `You evaluate student decisions in a classroom simulation. Follow these rules exactly:

OUTCOME
- Write a specific consequence in one or two short sentences that says what happened.
- Write one short outcomeReasoning sentence that clearly says why it happened.
- Use "excellent", "decent", or "poor" for outcomeRating.
- Do not use numbers, percentages, dollar amounts, made-up data, or em dashes.
- Use everyday words that a sixteen-year-old would understand.

IMPACT ROWS
- Return exactly four rows.
- Choose labels that fit this scenario. History can use Evidence Quality, Public Understanding, Political Stability, or Preservation. Healthcare can use Patient Care, Access to Help, Staff Workload, or Time and Cost. Business can use Customer Trust, Audience Reach, Team Confidence, or Time and Effort.
- Do not use Revenue, NPS, Retention, Operational Capacity, Stakeholders, Scalability, Feasibility, or other business jargon unless the scenario itself uses and explains the term.
- Use "up" for improved, "down" for worse, "neutral" for mixed or unchanged, and "cost" for time, effort, or resources.
- Each description must be one short qualitative sentence with no numbers.
- Each reason must be one short plain-language sentence explaining why.
- Keep every label short and capitalize its main words.

FEEDBACK
- Give one short, helpful sentence about the student's reasoning.
- Use plain language and do not reveal a supposed correct answer.`,
      user: `Scenario: ${input.scenarioTitle}
Context: ${(input.scenarioContext || "").slice(0, 5000)}
Role: ${input.roleLabel || "Decision maker"}
Decision: ${input.decisionPrompt}
Choice: ${input.optionLabel || ""}. ${input.optionTitle || ""}
Choice details: ${input.optionDescription || ""}
Student reasoning: ${input.justification || "No reasoning supplied"}`,
      schema: ConsequenceSchema,
      temperature: 0.4,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate consequence" },
      { status: 500 },
    );
  }
}
