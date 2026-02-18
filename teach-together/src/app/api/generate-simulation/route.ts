import { NextRequest, NextResponse } from "next/server";
import { generateSimulationContent } from "@/lib/openai";
import { extractTextFromFiles } from "@/lib/file-parser";

// Cap materials so we stay under the model's TPM. gpt-4o tier 1 = 30k TPM; gpt-4o-mini = 200k TPM (~4 chars/token).
const MAX_MATERIAL_CHARS_GPT4O = 70_000;
const MAX_MATERIAL_CHARS_MINI = 280_000; // safe for 200k TPM (input + output)

function getMaxMaterialChars(): number {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  return model.includes("mini") ? MAX_MATERIAL_CHARS_MINI : MAX_MATERIAL_CHARS_GPT4O;
}

function truncateMaterials(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return (
    text.slice(0, maxChars) +
    "\n\n[Content was truncated due to length limits. Use a shorter excerpt or paste only key sections for best results.]"
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const title = formData.get("title") as string;
    const courseTopic = formData.get("courseTopic") as string;
    const goal = formData.get("goal") as string;
    const targetDecisions = formData.get("targetDecisions") as string;
    const pastedText = formData.get("pastedText") as string;
    const aiNotes = formData.get("aiNotes") as string;
    
    // Get uploaded files
    const files: File[] = [];
    const fileEntries = formData.getAll("files");
    for (const entry of fileEntries) {
      if (entry instanceof File && entry.size > 0) {
        files.push(entry);
      }
    }

    // Extract text from files
    let materialText = "";
    if (files.length > 0) {
      materialText = await extractTextFromFiles(files);
    }

    // Combine with pasted text and truncate to stay under API token limits (TPM)
    const rawMaterials = [materialText, pastedText].filter(Boolean).join("\n\n");
    const allMaterials = truncateMaterials(rawMaterials, getMaxMaterialChars());

    // Generate simulation content using OpenAI
    const generated = await generateSimulationContent(
      allMaterials,
      goal,
      targetDecisions,
      courseTopic,
      aiNotes
    );

    // Override title if provided
    if (title) {
      generated.title = title;
    }

    return NextResponse.json({ success: true, simulation: generated });
  } catch (error) {
    const err = error as { message?: string; status?: number; code?: string; error?: { message?: string } };
    const rawMessage = err?.message || err?.error?.message || String(error);
    // User-friendly messages for common cases
    let userMessage = rawMessage;
    if (rawMessage.includes("429") || rawMessage.includes("rate_limit") || rawMessage.includes("TPM")) {
      userMessage = "Rate limit exceeded: your materials are too long or too many requests. Try shorter text or wait a minute.";
    } else if (rawMessage.includes("context_length") || rawMessage.includes("maximum context")) {
      userMessage = "Materials are too long. Use a shorter excerpt or fewer files.";
    } else if (rawMessage.includes("Failed to parse PDF")) {
      userMessage = rawMessage;
    } else if (rawMessage.length > 200) {
      userMessage = rawMessage.slice(0, 200) + "...";
    }
    console.error("[generate-simulation] Error:", rawMessage);
    if (error && typeof (error as Error).stack === "string") {
      console.error((error as Error).stack);
    }
    return NextResponse.json(
      { success: false, error: userMessage },
      { status: 500 }
    );
  }
}
