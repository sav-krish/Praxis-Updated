import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromFiles } from "@/lib/file-parser";
import { logger } from "@/lib/logger";
import { chunkText, embedText } from "@/lib/knowledge-base";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const subject = formData.get("subject") as string;

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    const files: File[] = [];
    const fileEntries = formData.getAll("files");
    for (const entry of fileEntries) {
      if (entry instanceof File && entry.size > 0) {
        files.push(entry);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
    }

    let totalChunks = 0;

    for (const file of files) {
      const text = await extractTextFromFiles([file]);
      if (!text.trim()) continue;

      const chunks = chunkText(text);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embedText(chunks[i]);

        const { error } = await supabase.from("knowledge_chunks").insert({
          subject,
          source_filename: file.name,
          chunk_index: i,
          content: chunks[i],
          embedding,
        });

        if (error) {
          logger.error(`Failed to insert chunk ${i} from ${file.name}:`, error);
        } else {
          totalChunks++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Ingested ${totalChunks} chunks from ${files.length} file(s) into subject "${subject}"`,
      totalChunks,
    });
  } catch (error) {
    logger.error("[ingest-knowledge] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}
