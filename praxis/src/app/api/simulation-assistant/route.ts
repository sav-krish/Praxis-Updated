import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateChatCompletion } from "@/lib/openai-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  role: z.string().max(120),
  scenario: z.string().max(7000),
  decision: z.string().max(2000).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const input = RequestSchema.parse(await request.json());
    const answer = await generateChatCompletion({
      system: `You are the Praxis student simulation coach.
Help the student understand the scenario, vocabulary, evidence, and tradeoffs.
Use Socratic questions and short explanations.
Never select an option, rank the choices, reveal scores, or write the student's justification.
Role: ${input.role}
Scenario: ${input.scenario}
Current decision: ${input.decision || "Briefing stage"}`,
      messages: [...input.history, { role: "user", content: input.message }],
      maxTokens: 500,
      temperature: 0.4,
    });
    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assistant unavailable" },
      { status: 500 },
    );
  }
}
