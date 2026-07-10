import type { z } from "zod";
import {
  getGeminiClient,
  getEmbeddingModel,
  getModel,
} from "@/lib/gemini-client";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function geminiRole(role: ChatMessage["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model response was not valid JSON.");
  }
}

export async function generateStructured<T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: input.model ?? getModel(),
    systemInstruction: input.system,
    generationConfig: {
      temperature: input.temperature ?? 0.7,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(input.user);
  const text = result.response.text();
  const json = extractJsonObject(text);
  const parsed = input.schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Structured output failed validation: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function generateJsonText(input: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: input.model ?? getModel(),
    systemInstruction: input.system,
    generationConfig: {
      temperature: input.temperature ?? 0.7,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(input.user);
  return result.response.text();
}

export async function streamJsonText(input: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  onDelta: (delta: string) => void;
}): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: input.model ?? getModel(),
    systemInstruction: input.system,
    generationConfig: {
      temperature: input.temperature ?? 0.7,
      responseMimeType: "application/json",
    },
  });

  const stream = await model.generateContentStream(input.user);
  let acc = "";
  for await (const chunk of stream.stream) {
    const piece = chunk.text();
    if (!piece) continue;
    acc += piece;
    input.onDelta(piece);
  }
  return acc;
}

export async function generateChatCompletion(input: {
  system: string;
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: input.model ?? getModel(),
    systemInstruction: input.system,
    generationConfig: {
      temperature: input.temperature ?? 0.7,
      maxOutputTokens: input.maxTokens ?? 2500,
    },
  });

  const history = input.messages
    .filter((m) => m.role !== "system")
    .slice(0, -1)
    .map((m) => ({
      role: geminiRole(m.role),
      parts: [{ text: m.content }],
    }));

  const last = input.messages[input.messages.length - 1];
  if (!last || last.role === "system") {
    throw new Error("Chat completion requires a final user message.");
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(last.content);
  return result.response.text();
}

export async function embedTextWithGemini(text: string): Promise<number[]> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: getEmbeddingModel() });
  const result = await model.embedContent(text);
  return result.embedding.values;
}
