import { logger } from "@/lib/logger";
import { embedTextWithGemini } from "@/lib/gemini-generate";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function embedText(text: string): Promise<number[]> {
  return embedTextWithGemini(text);
}

function toPgVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export function chunkText(text: string, maxTokens = 500): string[] {
  const approxCharsPerToken = 4;
  const chunkSize = maxTokens * approxCharsPerToken;
  const overlap = 200;
  const chunks: string[] = [];

  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start < 0) start = 0;
    if (end >= text.length) break;
  }

  return chunks;
}

export interface RetrievedChunk {
  content: string;
  subject: string;
  source_filename: string;
  similarity: number;
}

/**
 * Retrieves the most relevant knowledge base chunks for a given query.
 * Uses pgvector cosine similarity search via Supabase RPC or raw SQL.
 */
export async function retrieveRelevantChunks(
  supabase: SupabaseClient<Database>,
  query: string,
  options: { subject?: string; limit?: number } = {}
): Promise<RetrievedChunk[]> {
  const { limit = 8 } = options;

  const queryEmbedding = await embedText(query);

  // Use the match_knowledge_chunks RPC function
  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: toPgVector(queryEmbedding),
    match_count: limit,
    filter_subject: options.subject,
  });

  if (error) {
    logger.error("Knowledge base retrieval error:", error);
    return [];
  }

  return data || [];
}

/**
 * Formats retrieved chunks into a prompt-ready string for injection into the LLM context.
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  const formatted = chunks
    .map((c, i) => `[Reference ${i + 1} — ${c.source_filename}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `\n\n**PRAXIS KNOWLEDGE BASE — Reference Materials:**\n\n${formatted}\n\nUse these reference materials to ground the simulation in factual, well-established case content. Prefer information from these sources over creative invention.`;
}

/**
 * Fetches RAG chunks for generation prompts (same use as `/api/generate-simulation`).
 * Returns a formatted string to append to source materials, or "" if the query is empty.
 */
export async function buildKnowledgeContextForGeneration(
  supabase: SupabaseClient<Database>,
  ragQuery: string,
  options: { subject?: string; limit?: number } = {}
): Promise<string> {
  const q = ragQuery.trim();
  if (!q) return "";
  try {
    const chunks = await retrieveRelevantChunks(supabase, q, options);
    return formatChunksForPrompt(chunks);
  } catch (e) {
    logger.warn("[knowledge-base] RAG retrieval failed:", e);
    return "";
  }
}
