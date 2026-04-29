import { logger } from "@/lib/logger";
import * as mammoth from "mammoth";

export async function extractTextFromFile(
  file: File
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf")) {
    return extractFromPdf(buffer);
  } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
    return extractFromDocx(buffer);
  } else if (fileName.endsWith(".txt")) {
    return buffer.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${fileName}`);
  }
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text ?? "";
  } catch (error) {
    logger.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF file. Please try a different format.");
  }
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    logger.error("Error parsing DOCX:", error);
    throw new Error("Failed to parse DOCX file");
  }
}

export async function extractTextFromFiles(files: File[]): Promise<string> {
  const texts: string[] = [];
  
  for (const file of files) {
    try {
      const text = await extractTextFromFile(file);
      texts.push(`--- Content from ${file.name} ---\n${text}\n`);
    } catch (error) {
      logger.error(`Error processing ${file.name}:`, error);
      // Continue with other files
    }
  }
  
  return texts.join("\n\n");
}
