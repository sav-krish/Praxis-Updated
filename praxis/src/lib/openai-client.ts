import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "Missing credentials. Please set the OPENAI_API_KEY environment variable."
    );
  }
  cachedClient = new OpenAI({ apiKey: key });
  return cachedClient;
}

export const getModel = (): string =>
  process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Outline pass uses the cheaper / faster model regardless of the main model.
 * Outline is small (~400 tokens) so we pay almost nothing.
 */
export const getOutlineModel = (): string =>
  process.env.OPENAI_OUTLINE_MODEL || "gpt-4o-mini";
