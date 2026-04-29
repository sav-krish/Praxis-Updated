import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAIClient, getOutlineModel } from "@/lib/openai-client";
import { ALL_SUBJECTS } from "@/lib/subjects";
import { PREFERENCE_CATEGORIES } from "@/lib/simulation-metadata-presets";
import {
  BulkCaseMetadataInferSchema,
  type BulkCaseMetadataInfer,
} from "@/lib/openai-schemas";

const SYSTEM = `You are preparing metadata for importing a classroom case study into Praxis.
The instructor organizes files in folders that usually name the academic field (e.g. Marketing, Accounting).
The file name often hints at the case title or code.

CRITICAL: courseTopic, ragSubject (if not null), and every preference tag MUST match the allowed strings exactly — same spelling and capitalization as in the user message. Never invent new subject names or tag labels.

Set difficulty to easy, hard, or challenge from how demanding the case is (scope, ambiguity, prerequisite knowledge, number of tradeoffs). Use null only when the excerpt truly does not allow a judgment.

Simulation titles must read like a normal course title: use spaces between words, not slug-style hyphenation from file names.

You return only JSON matching the schema — concise, practical instructional-design choices.`;

function preferenceCatalogForPrompt(): string {
  const lines: string[] = [];
  for (const [key, def] of Object.entries(PREFERENCE_CATEGORIES)) {
    lines.push(`${key} — ${def.label}:`);
    for (const opt of def.options) {
      lines.push(`  - "${opt}"`);
    }
  }
  return lines.join("\n");
}

/**
 * One cheap LLM call: infer title, course topic, goals, preference tags, etc. from
 * folder path + file name + (possibly long, smart-truncated) case source text.
 */
export async function inferBulkCaseMetadata(input: {
  relativePathPosix: string;
  folderChain: string[];
  originalFileName: string;
  /** Head+tail–truncated case text (and optionally the same budget as the main generator). */
  caseSourceForInference: string;
}): Promise<BulkCaseMetadataInfer> {
  const subjectCatalog = ALL_SUBJECTS.map((s) => `- "${s}"`).join("\n");
  const folderHint =
    input.folderChain.length > 0
      ? input.folderChain.join(" → ")
      : "(no subject folders — file is directly under the bulk root)";

  const user = `Relative path from bulk root: ${input.relativePathPosix}
Subject folders (outer → inner): ${folderHint}
File name: ${input.originalFileName}

— Approved SUBJECT / courseTopic values (pick exactly one for courseTopic; same list for ragSubject or use null):
${subjectCatalog}

— Approved PREFERENCE tags (pick 0–3 per category; use exact strings including punctuation):
${preferenceCatalogForPrompt()}

Case source for analysis (may truncate middle with a marker if very long — read carefully; grounded in the actual document, not only the folder name):
---
${input.caseSourceForInference}
---

Infer the metadata. Prefer folder names as the discipline when they clearly indicate a field, but courseTopic must still be one of the approved subject strings (e.g. map "sales" folder → "Sales").
Pick 0–3 options per preference category; use empty arrays when unsure.`;

  const openai = getOpenAIClient();
  const model = process.env.BULK_INFER_MODEL?.trim() || getOutlineModel();

  const completion = await openai.chat.completions.parse({
    model,
    temperature: 0.35,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    response_format: zodResponseFormat(BulkCaseMetadataInferSchema, "bulk_case_metadata"),
  });

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new Error("Bulk metadata inference returned no parsed content.");
  }
  return parsed;
}

/** Maps inference output into the bulk manifest merge shape; strips useless RAG filters. */
export function bulkInferToFileEntry(i: BulkCaseMetadataInfer): {
  title: string;
  courseTopic: string;
  goal: string;
  targetDecisions: string;
  aiNotes?: string;
  difficulty?: "easy" | "hard" | "challenge";
  ragSubject?: string;
  preferences?: Record<string, string[]>;
} {
  const preferences = {
    style: i.preferences.style,
    interaction: i.preferences.interaction,
    focus: i.preferences.focus,
    assessment: i.preferences.assessment,
  };
  const hasPrefs = Object.values(preferences).some((a) => a.length > 0);
  const rag =
    i.ragSubject != null && i.ragSubject !== "Other / Custom"
      ? i.ragSubject
      : undefined;
  return {
    title: i.title,
    courseTopic: i.courseTopic,
    goal: i.goal,
    targetDecisions: i.targetDecisions,
    aiNotes: i.aiNotes ?? undefined,
    ...(i.difficulty != null ? { difficulty: i.difficulty } : {}),
    ragSubject: rag,
    ...(hasPrefs ? { preferences } : {}),
  };
}
