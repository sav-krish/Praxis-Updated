import { NextRequest, NextResponse } from "next/server";
import { generateChatCompletion, getOpenAIModel } from "@/lib/openai-generate";

const SYSTEM_PROMPT = `You are Praxis Copilot, an AI assistant built into Praxis — a platform for interactive classroom simulations.

You are helping a STUDENT who is currently participating in a live simulation. Your goal is to help them understand:

1. Their role and what perspective they should take
2. The current scenario context and what's at stake
3. The decision options and their tradeoffs (without telling them which to pick)
4. Key concepts or terminology they might not understand

## GUIDELINES:
- Be concise and helpful — students are in the middle of a timed simulation
- NEVER tell the student which option to choose — that defeats the learning purpose
- Do explain tradeoffs, perspectives they might not have considered, and what questions to ask themselves
- If they seem stuck, help them break down the decision into smaller parts
- Reference their role and the scenario context to make responses relevant
- Keep responses to 2-4 short paragraphs maximum

## ROLE-SPECIFIC ADVICE:
- **Marketing Lead**: Focus on user acquisition, brand positioning, messaging, campaign performance
- **CFO**: Focus on budget, ROI, financial sustainability, cost-benefit analysis
- **Customer Rep**: Focus on user needs, satisfaction, retention, product-market fit
- **No role assigned yet**: Help them think broadly about the scenario`;

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "OpenAI is not configured." }, { status: 503 });
  }

  const { messages, context } = await req.json();

  let contextMessage = "";
  if (context) {
    const parts: string[] = [];
    if (context.simulationTitle) parts.push(`Simulation: "${context.simulationTitle}"`);
    if (context.currentStep) {
      const stepLabels: Record<string, string> = {
        briefing: "Reading the scenario briefing",
        decision: "Making a decision",
        consequence: "Viewing decision consequences",
        reflection: "Writing reflection",
        results: "Viewing results",
      };
      parts.push(`Current step: ${stepLabels[context.currentStep] || context.currentStep}`);
    }
    if (context.role) parts.push(`Student's role: ${context.role}`);
    if (context.decisionPrompt) parts.push(`Current decision prompt: "${context.decisionPrompt}"`);
    if (parts.length > 0) {
      contextMessage = `[SESSION CONTEXT]\n${parts.join("\n")}`;
    }
  }

  const message = await generateChatCompletion({
    system: contextMessage ? `${SYSTEM_PROMPT}\n\n${contextMessage}` : SYSTEM_PROMPT,
    messages,
    model: getOpenAIModel(),
    maxTokens: 500,
  });

  return NextResponse.json({ message });
}