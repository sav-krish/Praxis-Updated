import { NextRequest, NextResponse } from "next/server";
import { generateChatCompletion, getOpenAIModel } from "@/lib/openai-generate";

const JUSTIFICATION_FEEDBACK_SYSTEM_PROMPT = `You are a thoughtful tutor reviewing a student's reasoning in a business simulation.

Given the scenario context, their chosen decision option, and their justification, provide constructive feedback that:
1. Highlights strong points in their reasoning (specific factors they correctly identified)
2. Points out any overlooked variables or perspectives they may have missed
3. Asks 1 thought-provoking question to deepen their analysis

## GUIDELINES:
- Be encouraging but honest — this is a learning tool
- Keep feedback to 2-4 sentences
- Do NOT say whether their choice was "right" or "wrong"
- Focus on the quality of their reasoning, not the outcome
- Reference specific details from their justification when possible`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "OpenAI is not configured." }, { status: 503 });
  }

  const { scenarioTitle, decisionPrompt, optionTitle, justification, roleLabel } = await req.json();

  if (!justification || !justification.trim()) {
    return NextResponse.json({ feedback: null });
  }

  const userPrompt = `Simulation: "${scenarioTitle || "Unknown"}"
Role: "${roleLabel || "No specific role"}"
Decision: "${decisionPrompt}"
Chosen Option: "${optionTitle}"
Student's Justification: "${justification}"

Provide constructive feedback on this student's reasoning.`;

  const message = await generateChatCompletion({
    system: JUSTIFICATION_FEEDBACK_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    model: getOpenAIModel(),
    maxTokens: 300,
    temperature: 0.7,
  });

  return NextResponse.json({ feedback: message });
}