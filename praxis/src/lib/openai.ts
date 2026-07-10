import { runSimulationPipelineMerged } from "@/lib/openai-pipeline";

export { getGeminiClient, getModel, getOutlineModel, getOpenAIClient } from "@/lib/gemini-client";

export interface GeneratedDataBlock {
  block_type: import("@/types/data-blocks").DataBlockType;
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
  return runSimulationPipelineMerged({
    materials,
    goal,
    targetDecisions,
    courseTopic,
    aiNotes,
    difficulty,
    ...options,
  });
}
