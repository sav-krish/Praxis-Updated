import { NextRequest, NextResponse } from "next/server";
import { generateSimulationContent } from "@/lib/openai";
import { extractTextFromFiles } from "@/lib/file-parser";

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

    // Combine with pasted text
    const allMaterials = [materialText, pastedText].filter(Boolean).join("\n\n");

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
    console.error("Error generating simulation:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate simulation" },
      { status: 500 }
    );
  }
}
