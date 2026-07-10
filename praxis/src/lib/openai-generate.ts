import type { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing OpenAI credentials. Please set the OPENAI_API_KEY environment variable."
    );
  }
  return new OpenAI({ apiKey });
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o";
}

export async function generateStructured<T>(input: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const client = getOpenAIClient();
  const model = input.model ?? getOpenAIModel();

  const result = await client.chat.completions.parse({
    model,
    messages: [
      { role: "system", content: input.system } as ChatCompletionMessageParam,
      { role: "user", content: input.user } as ChatCompletionMessageParam,
    ],
    temperature: input.temperature ?? 0.7,
    response_format: zodResponseFormat(input.schema, "structured_output"),
  });

  const parsed = result.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("Structured output failed to parse.");
  }
  return parsed;
}

export async function generateJsonText(input: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const client = getOpenAIClient();
  const model = input.model ?? getOpenAIModel();

  const result = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: input.temperature ?? 0.7,
    response_format: { type: "json_object" },
  });

  return result.choices[0]?.message.content ?? "";
}

export async function streamJsonText(input: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  onDelta: (delta: string) => void;
}): Promise<string> {
  const client = getOpenAIClient();
  const model = input.model ?? getOpenAIModel();

  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
    temperature: input.temperature ?? 0.7,
    response_format: { type: "json_object" },
    stream: true,
  });

  let acc = "";
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta.content ?? "";
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
  const client = getOpenAIClient();
  const model = input.model ?? getOpenAIModel();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: input.system },
    ...input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }) as ChatCompletionMessageParam),
  ];

  const result = await client.chat.completions.create({
    model,
    messages,
    temperature: input.temperature ?? 0.7,
    max_tokens: input.maxTokens ?? 2500,
  });

  return result.choices[0]?.message.content ?? "";
}
