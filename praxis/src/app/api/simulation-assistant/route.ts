import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateChatCompletion } from "@/lib/openai-generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.literal("help").optional(),
  role: z.string().max(120).optional(),
  scenario: z.string().max(7000).optional(),
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
      system: `You are the Praxis Help assistant.
Answer only general questions about the Praxis learning platform and how its simulations work, including briefs, decisions, consequences, anonymous class votes, leaderboards, reflections, reports, privacy, and troubleshooting.
You do not have access to the student's current simulation, scenario, role, decision, options, or correct outcome. Say so plainly when a question requires that context.
Never select, rank, recommend, eliminate, or hint at a decision option. Never reveal scores in advance, write a student's justification, or provide guidance that creates an unfair advantage.
Keep answers concise, supportive, and process-focused.`,
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
