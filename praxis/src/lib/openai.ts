import OpenAI from "openai";
import type { DataBlockType } from "@/types/data-blocks";

export function getOpenAIClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing credentials. Please set the OPENAI_API_KEY environment variable.");
  }
  return new OpenAI({ apiKey: key });
}

export const getModel = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

export interface GeneratedDataBlock {
  block_type: DataBlockType;
  title: string;
  data: Record<string, unknown>;
}

export interface GeneratedHiddenProfile {
  profile_name: string;
  private_briefing: string;
}

export interface GeneratedSimulation {
  title: string;
  backgroundContent: string;
  dataBlocks?: GeneratedDataBlock[];
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
  /** Present when instructor requested asymmetric / hidden roles */
  hiddenProfiles?: GeneratedHiddenProfile[];
}

export interface GenerationOptions {
  stayCloseToSource?: boolean;
  reframeAs?: string;
  preferences?: Record<string, string[]>;
  hiddenProfilesWanted?: boolean;
}

export async function generateSimulationContent(
  materials: string,
  goal: string,
  targetDecisions: string,
  courseTopic: string,
  aiNotes: string,
  difficulty: "easy" | "hard" | "challenge" = "hard",
  options: GenerationOptions = {}
): Promise<GeneratedSimulation> {
  const wantHiddenProfiles = options.hiddenProfilesWanted === true;
  const hiddenProfilesGuidance = wantHiddenProfiles
    ? `\n\nHIDDEN STUDENT ROLES (required): Include a "hiddenProfiles" array with exactly 3 distinct roles. Each has a short profile_name and a private_briefing (1–3 short paragraphs, Markdown allowed). Each role must see different private facts, constraints, or incentives aligned with the scenario and source materials — asymmetric information for classroom play. Roles must be editable later by the instructor.`
    : "";

  const difficultyGuidance =
    difficulty === "easy"
      ? "EASY (~15 min): Keep the background scenario concise (roughly half a page). Use simpler, more straightforward decisions with clearer tradeoffs. Fewer data blocks (1-2) with essential info only."
      : difficulty === "challenge"
        ? "CHALLENGE (~40 min): Create a rich, detailed background (1.5-2 pages). Include nuanced decisions with subtle distinctions between options. Use 2-3 data blocks with more depth. Consequence text can be longer. Aim for higher complexity and ambiguity."
        : "HARD (~25 min): Standard length background (1-2 pages). Moderate complexity—decisions with meaningful tradeoffs but not overly obscure. Include 1-3 data blocks. Balance clarity with nuance.";

  // Default: stay close to source material (no UI toggle; always on)
  const sourceConstraint = options.stayCloseToSource !== false
    ? `\n\nSOURCE FIDELITY CONSTRAINT: You MUST base ALL decisions, scenarios, background content, and details strictly on the provided source materials. Do NOT introduce new angles, topics, creative interpretations, or details not present in the source. If the source covers a specific case or event, stay faithful to its framing and facts.`
    : "";

  const preferencesBlock = options.preferences
    ? Object.entries(options.preferences)
        .filter(([, values]) => values.length > 0)
        .map(([category, values]) => `- ${category}: ${values.join(", ")}`)
        .join("\n")
    : "";
  const preferencesConstraint = preferencesBlock
    ? `\n\nINSTRUCTOR PREFERENCES (tailor the simulation accordingly):\n${preferencesBlock}`
    : "";

  const reframeConstraint = options.reframeAs
    ? `\n\nREFRAME / CAMOUFLAGE INSTRUCTION: The instructor wants you to disguise or reframe the original scenario. Rewrite the entire simulation as if it takes place in this alternate setting: "${options.reframeAs}". Preserve all the core dilemmas, decision structures, and learning objectives from the source material, but translate names, organizations, industries, and surface details into the new framing. The students should not immediately recognize the original case.`
    : "";

  const systemPrompt = `You are an expert instructional designer specializing in creating interactive classroom simulations for higher education. Your task is to create engaging decision-based simulations that help students understand complex concepts through realistic scenarios.

DIFFICULTY LEVEL: ${difficulty.toUpperCase()} — ${difficultyGuidance}

You will generate a complete simulation with:
1. A compelling background/scenario (length adjusted for difficulty)
2. A "dataBlocks" array of 1-3 structured data visualizations (tables, charts, timelines, KPI cards) that support the scenario. Choose the type that best fits: tables for lists/comparisons, bar_chart for category comparisons, line_chart for trends over time, kpi_cards for key metrics, timeline for event sequences, pie_chart for parts-of-a-whole (e.g. budget allocation, market share).
3. Exactly 3 decision points, each with exactly 3 options (A, B, C)
4. Each option should have a score from 1-3 (3 being the most optimal choice)
5. Realistic consequences for each choice
6. 2 reflection questions

The simulation should be realistic and create genuine dilemmas. Tailor complexity and length to the difficulty level.${sourceConstraint}${reframeConstraint}${preferencesConstraint}${hiddenProfilesGuidance}`;

  const userPrompt = `Create a simulation based on the following:

**Course subject / discipline:** ${courseTopic}
Please use discipline-appropriate terminology, real-world examples, realistic roles, and professional language conventions specific to the ${courseTopic} field.

**Difficulty / Target Length:** ${difficulty} (~${difficulty === "easy" ? "15" : difficulty === "challenge" ? "40" : "25"} min) — tailor scenario length and decision complexity accordingly.

**Learning Goal:** ${goal || "Help students understand key concepts and decision-making in this field"}

**Types of Decisions to Explore:** ${targetDecisions || "Tradeoffs, ethical dilemmas, and strategic choices"}

**Source Materials:**
${materials || "No specific materials provided - create a realistic scenario based on the topic."}

**Additional Guidelines:**
${aiNotes || "None specified"}

Generate a complete simulation in this JSON format. Include 1-3 dataBlocks that fit the scenario (e.g., financials table, stakeholder list, timeline of events, bar chart comparing options, pie chart for budget/share breakdown, KPI cards for key metrics).
${wantHiddenProfiles ? `You MUST include "hiddenProfiles" as an array of exactly 3 objects: { "profile_name": "...", "private_briefing": "..." }.` : `Do NOT include "hiddenProfiles" in the JSON.`}

{
  "title": "Simulation title",
  "backgroundContent": "The full background scenario (1-2 pages). Reference the data blocks where appropriate.",
  "dataBlocks": [
    {
      "block_type": "table",
      "title": "Example: Q3 Financial Summary",
      "data": {
        "headers": ["Metric", "Value"],
        "rows": [["Revenue", "$2.1M"], ["Margin", "12%"]]
      }
    },
    {
      "block_type": "bar_chart",
      "title": "Example: Department Performance",
      "data": { "labels": ["Sales", "Ops", "R&D"], "values": [85, 72, 90] }
    },
    {
      "block_type": "kpi_cards",
      "title": "Example: Key Metrics",
      "data": { "items": [{"label": "Headcount", "value": "47", "subtext": "FTE"}, {"label": "Runway", "value": "8 mo", "subtext": "at current burn"}] }
    },
    {
      "block_type": "timeline",
      "title": "Example: Recent Events",
      "data": { "events": [{"date": "Jan 15", "title": "CEO departs", "detail": "Announced suddenly"}, {"date": "Feb 1", "title": "Interim appointed"}] }
    },
    {
      "block_type": "line_chart",
      "title": "Example: Revenue Trend",
      "data": { "xLabel": "Quarter", "series": [{"label": "Revenue", "data": [{"x": "Q1", "y": 1.8}, {"x": "Q2", "y": 2.0}, {"x": "Q3", "y": 2.1}]}] }
    },
    {
      "block_type": "pie_chart",
      "title": "Example: Budget Allocation",
      "data": { "labels": ["Ops", "R&D", "Sales"], "values": [45, 35, 20] }
    }
  ],
  "decisions": [
    {
      "prompt": "Decision prompt",
      "options": [
        { "label": "A", "title": "Short title", "description": "Description", "consequence": "Result", "score": 3 },
        { "label": "B", "title": "Short title", "description": "Description", "consequence": "Result", "score": 2 },
        { "label": "C", "title": "Short title", "description": "Description", "consequence": "Result", "score": 1 }
      ]
    }
  ],
  "reflectionQuestions": ["First question", "Second question"]${wantHiddenProfiles ? `,
  "hiddenProfiles": [
    { "profile_name": "CFO", "private_briefing": "You alone know..." },
    { "profile_name": "Union lead", "private_briefing": "Your members expect..." },
    { "profile_name": "Board liaison", "private_briefing": "The board told you privately..." }
  ]` : ""}
}

Block type must be one of: table, bar_chart, line_chart, kpi_cards, timeline, pie_chart.
For pie_chart: data has "labels" and "values" (same as bar_chart), e.g. { "labels": ["A", "B", "C"], "values": [30, 50, 20] } for parts of a whole.
Generate exactly 3 decisions with exactly 3 options each. Include 1-3 dataBlocks. Ensure valid JSON.`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: getModel(),
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

  // Validate and normalize dataBlocks (optional)
  const validBlockTypes: DataBlockType[] = ["table", "bar_chart", "line_chart", "kpi_cards", "timeline", "pie_chart"];
  if (parsed.dataBlocks && Array.isArray(parsed.dataBlocks)) {
    parsed.dataBlocks = parsed.dataBlocks
      .filter((b: GeneratedDataBlock) => b && validBlockTypes.includes(b.block_type) && b.data)
      .slice(0, 5); // Cap at 5 blocks
  } else {
    parsed.dataBlocks = [];
  }

  if (wantHiddenProfiles) {
    let hp = Array.isArray(parsed.hiddenProfiles) ? parsed.hiddenProfiles : [];
    hp = hp
      .filter(
        (p: GeneratedHiddenProfile) =>
          p && typeof p.profile_name === "string" && typeof p.private_briefing === "string"
      )
      .slice(0, 6);
    while (hp.length < 3) {
      hp.push({
        profile_name: `Role ${hp.length + 1}`,
        private_briefing: "Edit this private briefing in Run Settings after generation.",
      });
    }
    parsed.hiddenProfiles = hp.slice(0, 6);
  } else {
    delete parsed.hiddenProfiles;
  }

  return parsed;
}
