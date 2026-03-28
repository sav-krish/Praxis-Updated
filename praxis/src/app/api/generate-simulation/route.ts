import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateSimulationContent } from "@/lib/openai";
import { extractTextFromFiles } from "@/lib/file-parser";
import { createClient } from "@/lib/supabase/server";
import { retrieveRelevantChunks, formatChunksForPrompt } from "@/lib/knowledge-base";

const BUCKET = "simulation-uploads";
const ALLOWED_MIMES = [
  "application/pdf",
  "application/x-pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").replace(/[^\w.-]/g, "_");
  return base || "file";
}

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
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    
    const title = formData.get("title") as string;
    const courseTopic = formData.get("courseTopic") as string;
    const difficulty = (formData.get("difficulty") as string) || "hard";
    const goal = formData.get("goal") as string;
    const targetDecisions = formData.get("targetDecisions") as string;
    const pastedText = formData.get("pastedText") as string;
    const aiNotes = formData.get("aiNotes") as string;
    // Default true: stay close to source (no UI toggle; system default)
    const stayCloseToSource = formData.get("stayCloseToSource") !== "false";
    const reframeAs = (formData.get("reframeAs") as string) || "";
    const preferencesRaw = formData.get("preferences") as string;
    let preferences: Record<string, string[]> | undefined;
    if (preferencesRaw) {
      try {
        preferences = JSON.parse(preferencesRaw);
      } catch { /* ignore parse errors */ }
    }
    const hiddenProfilesWanted = formData.get("hiddenProfilesEnabled") === "true";
    
    // Get uploaded files
    const files: File[] = [];
    const fileEntries = formData.getAll("files");
    for (const entry of fileEntries) {
      if (entry instanceof File && entry.size > 0) {
        files.push(entry);
      }
    }

    // Upload files to storage and collect paths
    const uploadedFilePaths: { path: string; originalName: string }[] = [];
    if (files.length > 0) {
      const uploadId = randomUUID();
      const supabaseStorage = await createClient();
      for (const file of files) {
        const mime = file.type?.toLowerCase();
        if (!mime || !ALLOWED_MIMES.includes(mime)) continue;
        const sanitized = sanitizeFilename(file.name);
        const storagePath = `${user.id}/${uploadId}/${sanitized}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error } = await supabaseStorage.storage
          .from(BUCKET)
          .upload(storagePath, buffer, {
            contentType: mime,
            upsert: false,
          });
        if (!error) {
          uploadedFilePaths.push({ path: storagePath, originalName: file.name });
        }
      }
    }

    // Extract text from files
    let materialText = "";
    if (files.length > 0) {
      materialText = await extractTextFromFiles(files);
    }

    // Retrieve relevant knowledge base chunks (RAG)
    let knowledgeContext = "";
    try {
      const supabase = await createClient();
      const ragQuery = `${courseTopic} ${goal} ${targetDecisions}`.trim();
      if (ragQuery) {
        const chunks = await retrieveRelevantChunks(supabase, ragQuery, {
          subject: undefined,
          limit: 8,
        });
        knowledgeContext = formatChunksForPrompt(chunks);
      }
    } catch (e) {
      console.warn("[generate-simulation] RAG retrieval failed, proceeding without knowledge base:", e);
    }

    // Combine with pasted text, knowledge base, and truncate to stay under API token limits (TPM)
    const rawMaterials = [materialText, pastedText, knowledgeContext].filter(Boolean).join("\n\n");
    const allMaterials = truncateMaterials(rawMaterials, getMaxMaterialChars());

    // Generate simulation content using OpenAI
    const generated = await generateSimulationContent(
      allMaterials,
      goal,
      targetDecisions,
      courseTopic,
      aiNotes,
      difficulty as "easy" | "hard" | "challenge",
      { stayCloseToSource, reframeAs, preferences, hiddenProfilesWanted }
    );

    // Override title if provided
    if (title) {
      generated.title = title;
    }

    return NextResponse.json({
      success: true,
      simulation: generated,
      uploadedFilePaths,
    });
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
