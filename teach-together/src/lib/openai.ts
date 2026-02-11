import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GeneratedSimulation {
  title: string;
  backgroundContent: string;
  decisions: {
    prompt: string;
    options: {
      label: "A" | "B" | "C";
      title: string;
      description: string;
      consequence: string;
      score: number;
    }[];
  }[];
  reflectionQuestions: string[];
}

export async function generateSimulationContent(
  materials: string,
  goal: string,
  targetDecisions: string,
  courseTopic: string,
  aiNotes: string
): Promise<GeneratedSimulation> {
  const systemPrompt = `You are an expert instructional designer specializing in creating interactive classroom simulations for higher education. Your task is to create engaging decision-based simulations that help students understand complex concepts through realistic scenarios.

You will generate a complete simulation with:
1. A compelling background/scenario (1-2 pages worth of content)
2. Exactly 3 decision points, each with exactly 3 options (A, B, C)
3. Each option should have a score from 1-3 (3 being the most optimal choice)
4. Realistic consequences for each choice
5. 2 reflection questions

The simulation should be realistic, nuanced, and create genuine dilemmas where there isn't always a clearly "right" answer, though some choices are more optimal than others.`;

  const userPrompt = `Create a simulation based on the following:

**Course/Topic:** ${courseTopic}

**Learning Goal:** ${goal || "Help students understand key concepts and decision-making in this field"}

**Types of Decisions to Explore:** ${targetDecisions || "Tradeoffs, ethical dilemmas, and strategic choices"}

**Source Materials:**
${materials || "No specific materials provided - create a realistic scenario based on the topic."}

**Additional Guidelines:**
${aiNotes || "None specified"}

Please generate a complete simulation in the following JSON format:
{
  "title": "Simulation title",
  "backgroundContent": "The full background scenario (1-2 pages, can include multiple paragraphs)",
  "decisions": [
    {
      "prompt": "Decision prompt explaining the situation and what choice needs to be made",
      "options": [
        {
          "label": "A",
          "title": "Short option title",
          "description": "Fuller description of what this choice entails",
          "consequence": "What happens as a result of this choice",
          "score": 3
        },
        {
          "label": "B",
          "title": "Short option title",
          "description": "Fuller description of what this choice entails",
          "consequence": "What happens as a result of this choice",
          "score": 2
        },
        {
          "label": "C",
          "title": "Short option title",
          "description": "Fuller description of what this choice entails",
          "consequence": "What happens as a result of this choice",
          "score": 1
        }
      ]
    }
  ],
  "reflectionQuestions": [
    "First reflection question",
    "Second reflection question"
  ]
}

Generate exactly 3 decisions with exactly 3 options each. Ensure the JSON is valid and complete.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content received from OpenAI");
  }

  const parsed = JSON.parse(content) as GeneratedSimulation;
  
  // Validate the structure
  if (!parsed.decisions || parsed.decisions.length !== 3) {
    throw new Error("Invalid simulation structure: expected 3 decisions");
  }

  for (const decision of parsed.decisions) {
    if (!decision.options || decision.options.length !== 3) {
      throw new Error("Invalid simulation structure: expected 3 options per decision");
    }
  }

  return parsed;
}
