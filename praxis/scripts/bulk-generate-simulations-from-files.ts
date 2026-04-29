/**
 * Generate one draft simulation per case-study file using the same OpenAI pipeline
 * and RAG path as `/api/generate-simulation`, then persist to Supabase.
 *
 * Run from the `praxis/` directory:
 *   pnpm bulk:case-studies /path/to/root-folder
 *
 * **Folder layout (recommended)** — mirror subject folders like your file browser:
 *
 *   root/
 *     Marketing/
 *       pricing-case.pdf
 *     Accounting/
 *       revenue-recognition.docx
 *
 * The script walks subfolders. For each file it sends the **folder path + file name +
 * smart-truncated case text** (same head/tail strategy as the main generator) to a planning
 * model that picks title, **preset** course topic, goals, preference tags, and optional RAG subject.
 * **override** any inferred field when you set them.
 *
 * Manifest `files` keys can be just `case.pdf` or a relative path `Marketing/case.pdf`.
 *
 * Required env (`.env.local` via script):
 *   OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY),
 *   BULK_PROFESSOR_USER_ID
 *
 * Optional env:
 *   BULK_SKIP_INFER=1 — skip the metadata model pass; use folder name → course topic + file name → title heuristic only
 *   BULK_INFER_MODEL — model for metadata pass (default: same as OPENAI_OUTLINE_MODEL / gpt-4o-mini)
 *   BULK_COURSE_TOPIC, BULK_GOAL, … — fallbacks when inference + manifest omit a field
 *   BULK_DIFFICULTY — when BULK_SKIP_INFER=1 only: if unset or invalid, difficulty is chosen at random (easy/hard/challenge)
 *   BULK_RAG_LIMIT, BULK_SKIP_STORAGE, BULK_DELAY_MS, …
 */

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import type { Database, Json } from "@/types/database";
import {
  bulkInferToFileEntry,
  inferBulkCaseMetadata,
} from "@/lib/bulk-case-metadata-infer";
import { extractTextFromFile } from "@/lib/file-parser";
import { matchCourseTopicToPreset } from "@/lib/match-preset-subject";
import { generateSimulationContent } from "@/lib/openai";
import { buildKnowledgeContextForGeneration } from "@/lib/knowledge-base";
import { smartTruncateMaterials } from "@/lib/materials-chunk";
import {
  ensureProfessorRow,
  persistGeneratedSimulation,
} from "@/lib/persist-generated-simulation";
import {
  SIMULATION_ASSESSMENT_OPTIONS,
  SIMULATION_FOCUS_OPTIONS,
  SIMULATION_INTERACTION_OPTIONS,
  SIMULATION_STYLE_OPTIONS,
} from "@/lib/simulation-metadata-presets";

const EXT = new Set([".pdf", ".docx", ".doc", ".txt"]);

const BUCKET = "simulation-uploads";
const ALLOWED_MIMES = [
  "application/pdf",
  "application/x-pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

const MAX_MATERIAL_CHARS_GPT4O = 70_000;
const MAX_MATERIAL_CHARS_MINI = 280_000;

function getMaxMaterialChars(): number {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  return model.includes("mini") ? MAX_MATERIAL_CHARS_MINI : MAX_MATERIAL_CHARS_GPT4O;
}

const DIFFICULTY_OPTIONS = ["easy", "hard", "challenge"] as const;

function humanizeSimulationTitle(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function randomDifficulty(): (typeof DIFFICULTY_OPTIONS)[number] {
  return DIFFICULTY_OPTIONS[Math.floor(Math.random() * DIFFICULTY_OPTIONS.length)]!;
}

function parseEnvDifficulty(
  v: string | undefined
): (typeof DIFFICULTY_OPTIONS)[number] | undefined {
  const t = v?.trim().toLowerCase();
  if (t === "easy" || t === "hard" || t === "challenge") return t;
  return undefined;
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, "").replace(/[^\w.-]/g, "_");
  return base || "file";
}

function mimeForPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext === ".doc") return "application/msword";
  return "text/plain";
}

type BulkFileEntry = {
  title?: string;
  courseTopic?: string;
  goal?: string;
  targetDecisions?: string;
  aiNotes?: string;
  difficulty?: "easy" | "hard" | "challenge";
  preferences?: Record<string, string[]>;
  ragSubject?: string;
  reframeAs?: string;
  stayCloseToSource?: boolean;
  hiddenProfilesEnabled?: boolean;
};

type BulkManifest = {
  defaults?: BulkFileEntry;
  files?: Record<string, BulkFileEntry>;
};

function deepMergeFileConfig(
  envBase: Required<Pick<BulkFileEntry, "courseTopic" | "goal" | "targetDecisions" | "aiNotes">> & {
    ragSubject?: string;
  },
  defaults: BulkFileEntry | undefined,
  fileOverride: BulkFileEntry | undefined
): Required<Pick<BulkFileEntry, "courseTopic" | "goal" | "targetDecisions" | "aiNotes">> & {
  difficulty?: "easy" | "hard" | "challenge";
  title?: string;
  preferences?: Record<string, string[]>;
  ragSubject?: string;
  reframeAs?: string;
  stayCloseToSource: boolean;
  hiddenProfilesEnabled: boolean;
} {
  const merged: BulkFileEntry = { ...defaults, ...fileOverride };
  return {
    courseTopic: merged.courseTopic ?? envBase.courseTopic,
    goal: merged.goal ?? envBase.goal,
    targetDecisions: merged.targetDecisions ?? envBase.targetDecisions,
    aiNotes: merged.aiNotes ?? envBase.aiNotes,
    difficulty: merged.difficulty,
    title: merged.title,
    preferences: merged.preferences,
    ragSubject: merged.ragSubject ?? envBase.ragSubject,
    reframeAs: merged.reframeAs,
    stayCloseToSource: merged.stayCloseToSource !== false,
    hiddenProfilesEnabled: merged.hiddenProfilesEnabled === true,
  };
}

async function loadManifest(dir: string): Promise<BulkManifest | null> {
  try {
    const raw = await readFile(join(dir, "bulk-manifest.json"), "utf8");
    return JSON.parse(raw) as BulkManifest;
  } catch {
    return null;
  }
}

function filterPreferencesToPresetOptions(
  p: Record<string, string[]>
): Record<string, string[]> | undefined {
  const allow = {
    style: new Set<string>(SIMULATION_STYLE_OPTIONS),
    interaction: new Set<string>(SIMULATION_INTERACTION_OPTIONS),
    focus: new Set<string>(SIMULATION_FOCUS_OPTIONS),
    assessment: new Set<string>(SIMULATION_ASSESSMENT_OPTIONS),
  };
  const style = (p.style ?? []).filter((x) => allow.style.has(x));
  const interaction = (p.interaction ?? []).filter((x) => allow.interaction.has(x));
  const focus = (p.focus ?? []).filter((x) => allow.focus.has(x));
  const assessment = (p.assessment ?? []).filter((x) => allow.assessment.has(x));
  if (!style.length && !interaction.length && !focus.length && !assessment.length) {
    return undefined;
  }
  return { style, interaction, focus, assessment };
}

async function collectCaseStudyFiles(root: string): Promise<{ abs: string; rel: string }[]> {
  const out: { abs: string; rel: string }[] = [];
  async function walk(currentAbs: string) {
    const entries = await readdir(currentAbs, { withFileTypes: true });
    for (const e of entries) {
      const abs = join(currentAbs, e.name);
      if (e.isDirectory()) {
        await walk(abs);
      } else if (e.isFile() && EXT.has(extname(e.name).toLowerCase())) {
        out.push({ abs, rel: relative(root, abs) });
      }
    }
  }
  await walk(root);
  out.sort((a, b) => a.rel.localeCompare(b.rel, "en"));
  return out;
}

/** Map folder label to a UI subject when skipping LLM infer */
function folderFileHeuristic(relPosix: string, fileName: string): BulkFileEntry {
  const dir = dirname(relPosix);
  const chain = dir === "." ? [] : dir.split("/").filter(Boolean);
  const inner = chain.length ? chain[chain.length - 1] : undefined;
  const stem = basename(fileName, extname(fileName)).replace(/_/g, " ").trim();
  const entry: BulkFileEntry = {};
  if (inner) entry.courseTopic = matchCourseTopicToPreset(inner);
  if (stem) entry.title = humanizeSimulationTitle(stem);
  return entry;
}

async function main() {
  const dirArg = process.argv[2];
  if (!dirArg) {
    console.error("Usage: pnpm bulk:case-studies <path-to-root-folder>");
    process.exit(1);
  }

  const inputDir = resolve(dirArg);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const professorId = process.env.BULK_PROFESSOR_USER_ID?.trim();

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  if (!professorId) {
    console.error("Missing BULK_PROFESSOR_USER_ID (your Supabase auth user UUID).");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: prof, error: profErr } = await supabase
    .from("professors")
    .select("id, email, name")
    .eq("id", professorId)
    .single();

  if (profErr || !prof) {
    console.error("Could not load professors row for BULK_PROFESSOR_USER_ID:", profErr?.message);
    process.exit(1);
  }

  await ensureProfessorRow(supabase, {
    id: prof.id,
    email: prof.email,
    user_metadata: { name: prof.name },
  });

  const manifest = await loadManifest(inputDir);

  const envBase = {
    courseTopic: process.env.BULK_COURSE_TOPIC?.trim() || "General",
    goal:
      process.env.BULK_GOAL?.trim() ||
      "Lead a rich classroom debrief aligned with the case.",
    targetDecisions:
      process.env.BULK_TARGET_DECISIONS?.trim() ||
      "Three decision points that surface the central tradeoffs in the case.",
    aiNotes: process.env.BULK_AI_NOTES?.trim() || "",
    ragSubject: process.env.BULK_RAG_SUBJECT?.trim() || undefined,
  };

  const delayMs = Math.max(0, Number(process.env.BULK_DELAY_MS) || 1500);
  const skipStorage = process.env.BULK_SKIP_STORAGE === "1" || process.env.BULK_SKIP_STORAGE === "true";
  const skipInfer = process.env.BULK_SKIP_INFER === "1" || process.env.BULK_SKIP_INFER === "true";
  const ragLimit = Math.min(32, Math.max(1, Number(process.env.BULK_RAG_LIMIT) || 8));

  const fileList = await collectCaseStudyFiles(inputDir);

  if (fileList.length === 0) {
    console.error(`No .pdf/.docx/.doc/.txt files under ${inputDir} (recursively)`);
    process.exit(1);
  }

  if (manifest) {
    console.log("Using bulk-manifest.json for defaults and overrides (wins over model guesses).\n");
  }
  console.log(
    `Processing ${fileList.length} file(s) → simulations (metadata: ${skipInfer ? "folder+name only" : "model infers from folder+name+smart-truncated case text"}, RAG on, storage ${skipStorage ? "skipped" : "upload"})\n`
  );

  const results: { file: string; simulationId?: string; error?: string }[] = [];

  for (const { abs: fullPath, rel: relNative } of fileList) {
    const relPosix = relNative.split(sep).join("/");
    const name = basename(fullPath);
    process.stdout.write(`${relPosix}… `);

    try {
      const dir = dirname(relPosix);
      const folderChain = dir === "." ? [] : dir.split("/").filter(Boolean);

      const buf = await readFile(fullPath);
      const mime = mimeForPath(fullPath);
      const file = new File([buf], name, { type: mime });

      const uploadedFilePaths: { path: string; originalName: string }[] = [];
      if (!skipStorage && ALLOWED_MIMES.includes(mime.toLowerCase())) {
        const uploadId = randomUUID();
        const storagePath = `${professorId}/${uploadId}/${sanitizeFilename(relPosix)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
          contentType: mime,
          upsert: false,
        });
        if (upErr) {
          console.warn(
            `\n  [warn] Storage upload failed (${upErr.message}), continuing without file link.`
          );
        } else {
          uploadedFilePaths.push({ path: storagePath, originalName: relPosix });
        }
      }

      const materialText = await extractTextFromFile(file);
      const caseSourceForInfer = smartTruncateMaterials(materialText, getMaxMaterialChars());

      let modelLayer: BulkFileEntry = folderFileHeuristic(relPosix, name);
      if (!skipInfer) {
        try {
          modelLayer = bulkInferToFileEntry(
            await inferBulkCaseMetadata({
              relativePathPosix: relPosix,
              folderChain,
              originalFileName: name,
              caseSourceForInference: caseSourceForInfer,
            })
          );
        } catch (err) {
          console.warn(
            `\n  [warn] Metadata inference failed, using folder/file heuristic: ${err instanceof Error ? err.message : String(err)}`
          );
          modelLayer = folderFileHeuristic(relPosix, name);
        }
      }

      const fileManifest: BulkFileEntry = {
        ...(manifest?.files?.[name] ?? {}),
        ...(manifest?.files?.[relPosix] ?? {}),
      };

      const fileCfg = deepMergeFileConfig(envBase, manifest?.defaults, {
        ...modelLayer,
        ...fileManifest,
      });

      fileCfg.courseTopic = matchCourseTopicToPreset(fileCfg.courseTopic);
      if (fileCfg.ragSubject) {
        const r = matchCourseTopicToPreset(fileCfg.ragSubject);
        fileCfg.ragSubject = r === "Other / Custom" ? undefined : r;
      }
      if (fileCfg.preferences) {
        fileCfg.preferences = filterPreferencesToPresetOptions(fileCfg.preferences);
      }

      const resolvedDifficulty: (typeof DIFFICULTY_OPTIONS)[number] =
        fileCfg.difficulty ??
        (skipInfer
          ? parseEnvDifficulty(process.env.BULK_DIFFICULTY) ?? randomDifficulty()
          : randomDifficulty());
      fileCfg.difficulty = resolvedDifficulty;

      const ragQuery = `${fileCfg.courseTopic} ${fileCfg.goal} ${fileCfg.targetDecisions}`.trim();
      const knowledgeContext = await buildKnowledgeContextForGeneration(supabase, ragQuery, {
        subject: fileCfg.ragSubject,
        limit: ragLimit,
      });
      const rawMaterials = [materialText, knowledgeContext].filter(Boolean).join("\n\n");
      const allMaterials = smartTruncateMaterials(rawMaterials, getMaxMaterialChars());

      const generated = await generateSimulationContent(
        allMaterials,
        fileCfg.goal,
        fileCfg.targetDecisions,
        fileCfg.courseTopic,
        fileCfg.aiNotes,
        fileCfg.difficulty,
        {
          stayCloseToSource: fileCfg.stayCloseToSource,
          reframeAs: fileCfg.reframeAs || undefined,
          preferences: fileCfg.preferences,
          hiddenProfilesWanted: fileCfg.hiddenProfilesEnabled,
        }
      );

      const stem = basename(name, extname(name));
      const formTitle = humanizeSimulationTitle(
        fileCfg.title?.trim() || generated.title?.trim() || stem
      );

      const simulationId = await persistGeneratedSimulation(supabase, {
        professorId: prof.id,
        professorEmail: prof.email ?? "",
        professorName: prof.name,
        generated: { ...generated, title: formTitle },
        formTitle,
        courseTopic: fileCfg.courseTopic,
        difficulty: fileCfg.difficulty,
        goal: fileCfg.goal,
        targetDecisions: fileCfg.targetDecisions,
        aiNotes: fileCfg.aiNotes || null,
        hiddenProfilesEnabled: fileCfg.hiddenProfilesEnabled,
        preferences:
          fileCfg.preferences && Object.keys(fileCfg.preferences).length > 0
            ? (fileCfg.preferences as unknown as Json)
            : undefined,
        uploadedFilePaths: uploadedFilePaths.length ? uploadedFilePaths : undefined,
        pastedText: null,
      });

      console.log(`ok → ${simulationId}`);
      results.push({ file: relPosix, simulationId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`failed: ${msg}`);
      results.push({ file: relPosix, error: msg });
    }

    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const failed = results.filter((r) => r.error);
  console.log(`\nDone. ${results.length - failed.length} ok, ${failed.length} failed.`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
