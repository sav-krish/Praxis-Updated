import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { extractTextFromFiles } from "@/lib/file-parser";
import { createClient } from "@/lib/supabase/server";
import { buildKnowledgeContextForGeneration } from "@/lib/knowledge-base";
import { logger } from "@/lib/logger";
import { smartTruncateMaterials } from "@/lib/materials-chunk";
import { streamSimulationPipeline } from "@/lib/openai-pipeline";

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

const MAX_MATERIAL_CHARS_GPT4O = 70_000;
const MAX_MATERIAL_CHARS_MINI = 280_000;

function getMaxMaterialChars(): number {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  return model.includes("flash") ? MAX_MATERIAL_CHARS_MINI : MAX_MATERIAL_CHARS_GPT4O;
}

export const runtime = "nodejs";
export const maxDuration = 300;

const sseEncoder = new TextEncoder();

function sseDataString(obj: object): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function sseData(obj: object): Uint8Array {
  return sseEncoder.encode(sseDataString(obj));
}

export async function POST(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  const useStream = accept.includes("text/event-stream") || request.headers.get("x-praxis-sse") === "1";

  if (!useStream) {
    return NextResponse.json(
      {
        error:
          "Client must request SSE: fetch(..., { headers: { Accept: 'text/event-stream', 'x-praxis-sse': '1' } })",
      },
      { status: 400 }
    );
  }

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return new Response(sseDataString({ type: "error", error: "Unauthorized" }), { status: 401 });
  }
  const { data: profile } = await supabaseAuth
    .from("professors")
    .select("active_role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.active_role === "student") {
    return new Response(
      sseDataString({
        type: "error",
        error: "Student accounts cannot create simulations.",
      }),
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(sseDataString({ type: "error", error: "Invalid form data" }), { status: 400 });
  }

  const title = formData.get("title") as string;
  const courseTopic = formData.get("courseTopic") as string;
  const difficulty = (formData.get("difficulty") as string) || "hard";
  const goal = formData.get("goal") as string;
  const targetDecisions = formData.get("targetDecisions") as string;
  const pastedText = formData.get("pastedText") as string;
  const aiNotes = formData.get("aiNotes") as string;
  const stayCloseToSource = formData.get("stayCloseToSource") !== "false";
  const reframeAs = (formData.get("reframeAs") as string) || "";
  const preferencesRaw = formData.get("preferences") as string;
  let preferences: Record<string, string[]> | undefined;
  if (preferencesRaw) {
    try {
      preferences = JSON.parse(preferencesRaw);
    } catch {
      /* ignore */
    }
  }
  const hiddenProfilesWanted = formData.get("hiddenProfilesEnabled") === "true";

  const files: File[] = [];
  const fileEntries = formData.getAll("files");
  for (const entry of fileEntries) {
    if (entry instanceof File && entry.size > 0) {
      files.push(entry);
    }
  }

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
      const { error } = await supabaseStorage.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: mime,
        upsert: false,
      });
      if (!error) {
        uploadedFilePaths.push({ path: storagePath, originalName: file.name });
      }
    }
  }

  let materialText = "";
  if (files.length > 0) {
    materialText = await extractTextFromFiles(files);
  }

  let knowledgeContext = "";
  try {
    const supabase = await createClient();
    const ragQuery = `${courseTopic} ${goal} ${targetDecisions}`.trim();
    knowledgeContext = await buildKnowledgeContextForGeneration(supabase, ragQuery, {
      subject: undefined,
      limit: 8,
    });
  } catch (e) {
    logger.warn("[generate-simulation] RAG retrieval failed:", e);
  }

  const rawMaterials = [materialText, pastedText, knowledgeContext].filter(Boolean).join("\n\n");
  const allMaterials = smartTruncateMaterials(rawMaterials, getMaxMaterialChars());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(sseData(obj));
      try {
        for await (const ev of streamSimulationPipeline({
          materials: allMaterials,
          goal: goal || "",
          targetDecisions: targetDecisions || "",
          courseTopic: courseTopic || "General",
          aiNotes: aiNotes || "",
          difficulty: difficulty as "easy" | "hard" | "challenge",
          stayCloseToSource,
          reframeAs: reframeAs || undefined,
          preferences,
          hiddenProfilesWanted,
        })) {
          if (ev.type === "done" && title?.trim()) {
            ev.simulation = { ...ev.simulation, title: title.trim() };
          }
          send(ev);
        }
        send({ type: "uploaded", uploadedFilePaths: uploadedFilePaths as { path: string; originalName: string }[] });
        send({ type: "finished" as const });
        controller.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        send({ type: "error", error: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
