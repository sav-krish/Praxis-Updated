import { GoogleGenerativeAI } from "@google/generative-ai";

let cachedClient: GoogleGenerativeAI | null = null;

export function getGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing credentials. Please set the GEMINI_API_KEY environment variable."
    );
  }
  return key;
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  cachedClient = new GoogleGenerativeAI(getGeminiApiKey());
  return cachedClient;
}

export function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

export function getOutlineModel(): string {
  return (
    process.env.GEMINI_OUTLINE_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.0-flash"
  );
}

export function getEmbeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL?.trim() || "text-embedding-004";
}

/** Backward-compatible alias used across the codebase. */
export const getOpenAIClient = getGeminiClient;
