/**
 * Simulation-generation pipeline.
 *
 *   1. Outline pass (cheap, fast) → title + section briefs + decision stems.
 *   2. Four parallel sub-calls — background, decisions, dataBlocks, reflections —
 *      each constrained by `json_schema strict: true` so we never hit malformed
 *      JSON. Background streams token deltas so the client renders text early.
 *   3. Merge into the canonical `GeneratedSimulation` shape.
 *
 * The pipeline exposes both:
 *   - `runSimulationPipelineMerged(...)`: blocking, returns the final object —
 *     used by callers that need the legacy synchronous shape.
 *   - `streamSimulationPipeline(...)`: async iterator that yields lifecycle
 *     events the route forwards as SSE.
 *
 * Prompt-caching note: Gemini reuses identical system instructions efficiently.
 * We put the immutable instructional-design preamble first and the per-request
 * fields last, so the system + outline schema gets cached across requests for a
 * single instructor.
 */
import {
  generateJsonText,
  generateStructured,
  streamJsonText,
} from "@/lib/gemini-generate";
import { getModel, getOutlineModel } from "@/lib/gemini-client";
import {
  OutlineSchema,
  BackgroundSchema,
  DecisionsSchema,
  DataBlocksSchema,
  ReflectionQuestionsSchema,
  HiddenProfilesSchema,
  type SimulationOutline,
  type DecisionsResult,
  type DataBlocksResult,
  type ReflectionQuestionsResult,
  type HiddenProfilesResult,
} from "@/lib/openai-schemas";
import type {
  GeneratedSimulation,
  GeneratedDataBlock,
  GeneratedHiddenProfile,
} from "@/lib/openai";
import type { DataBlockType } from "@/types/data-blocks";

// ── Shared input type ──────────────────────────────────────────────────────
export interface PipelineInput {
  materials: string;
  goal: string;
  targetDecisions: string;
  courseTopic: string;
  aiNotes: string;
  difficulty: "easy" | "hard" | "challenge";
  stayCloseToSource?: boolean;
  reframeAs?: string;
  preferences?: Record<string, string[]>;
  hiddenProfilesWanted?: boolean;
}

// ── Stream events ──────────────────────────────────────────────────────────
export type StreamEvent =
  | { type: "outline"; outline: SimulationOutline }
  | { type: "background.delta"; delta: string }
  | { type: "background.done"; backgroundContent: string }
  | { type: "decisions"; decisions: GeneratedSimulation["decisions"] }
  | { type: "dataBlocks"; dataBlocks: GeneratedDataBlock[] }
  | { type: "reflectionQuestions"; reflectionQuestions: string[] }
  | { type: "hiddenProfiles"; hiddenProfiles: GeneratedHiddenProfile[] }
  | { type: "done"; simulation: GeneratedSimulation }
  | { type: "error"; error: string };

// ── Prompt construction ────────────────────────────────────────────────────
function difficultyGuidance(d: PipelineInput["difficulty"]): string {
  if (d === "easy")
    return "EASY (~15 min): Concise background (~half a page). Decisions with clearer tradeoffs. 1-2 data blocks.";
  if (d === "challenge")
    return "CHALLENGE (~40 min): Rich background (1.5-2 pages). Nuanced decisions with subtle distinctions. 2-3 data blocks with depth.";
  return "HARD (~25 min): Standard background (1-2 pages). Decisions with meaningful tradeoffs. 1-3 data blocks.";
}

/**
 * The instructional-design preamble is identical across every generation call —
 * keep it first to maximize reuse across generation calls.
 */
const SYSTEM_PREAMBLE = `You are an expert instructional designer specializing in creating interactive classroom simulations for higher education. You produce realistic, well-grounded scenarios that create genuine dilemmas. You write in a tight, professional tone, you cite source material faithfully, and you never invent statistics. Your output is always strictly valid JSON conforming to the requested schema.`;

function sourceFidelityClause(input: PipelineInput): string {
  if (input.stayCloseToSource === false) return "";
  return "\n\nSOURCE FIDELITY CONSTRAINT: Base ALL decisions, scenario details, and data blocks strictly on the provided source materials. Do not introduce new angles, topics, or facts that are not present in the sources.";
}

function reframeClause(input: PipelineInput): string {
  if (!input.reframeAs) return "";
  return `\n\nREFRAME / CAMOUFLAGE INSTRUCTION: Disguise the original setting. Re-write the entire scenario as if it takes place here: "${input.reframeAs}". Preserve the dilemmas and learning structure but translate names, organizations, and surface details.`;
}

function preferencesClause(input: PipelineInput): string {
  if (!input.preferences) return "";
  const entries = Object.entries(input.preferences).filter(
    ([, v]) => v.length > 0
  );
  if (entries.length === 0) return "";
  return (
    "\n\nINSTRUCTOR PREFERENCES (tailor accordingly):\n" +
    entries.map(([k, v]) => `- ${k}: ${v.join(", ")}`).join("\n")
  );
}

/** Per-request context block placed *last* so prefix caching works. */
function requestContext(input: PipelineInput): string {
  return `
Course subject / discipline: ${input.courseTopic}
Difficulty: ${input.difficulty.toUpperCase()} — ${difficultyGuidance(input.difficulty)}
Learning goal: ${input.goal || "Help students understand key concepts and decision-making in this field"}
Types of decisions to explore: ${input.targetDecisions || "Tradeoffs, ethical dilemmas, and strategic choices"}
Additional guidelines: ${input.aiNotes || "None specified"}

Source materials:
${input.materials || "No specific materials provided — create a realistic scenario based on the topic."}`.trim();
}

// ── Outline pass ───────────────────────────────────────────────────────────
async function generateOutline(
  input: PipelineInput
): Promise<SimulationOutline> {
  const system = `${SYSTEM_PREAMBLE}${sourceFidelityClause(input)}${reframeClause(input)}${preferencesClause(input)}

You will produce a tight outline for a 3-decision classroom simulation.
- Title is short and vivid, with spaces between words like a course module title (not hyphenated URL slugs).
- Decision stems are *one sentence each* and orthogonal (cover different stakes).
- Data block hints describe 1-3 deterministic visualizations grounded in the source material.`;

  const user = `Outline a simulation. Return only the JSON for the schema.

${requestContext(input)}`;

  return generateStructured({
    system,
    user,
    schema: OutlineSchema,
    model: getOutlineModel(),
    temperature: 0.7,
  });
}

// ── Sub-calls ──────────────────────────────────────────────────────────────
function commonSystem(input: PipelineInput, outline: SimulationOutline): string {
  return `${SYSTEM_PREAMBLE}${sourceFidelityClause(input)}${reframeClause(input)}${preferencesClause(input)}

You are filling in one section of the simulation titled "${outline.title}".
The student will play: ${outline.protagonistRole}.
Framing: ${outline.oneLineFraming}
The three decision stems are:
${outline.decisionStems.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Stay tight, concrete, and faithful to the source material.`;
}

async function generateBackground(
  input: PipelineInput,
  outline: SimulationOutline,
  onDelta?: (delta: string) => void
): Promise<string> {
  const system = commonSystem(input, outline);
  const user = `Write the background briefing the student reads first. Reference the data blocks in passing where it would help. Format with GitHub-Flavored Markdown inside backgroundContent: use ## for section titles, **double asterisks** for bold phrases, and hyphen bullets for lists. Never put the whole briefing inside a markdown code fence. Length is determined by difficulty. Output JSON.

${requestContext(input)}`;

  let acc = "";
  let lastBgLen = 0;
  const raw = await streamJsonText({
    system,
    user,
    model: getModel(),
    temperature: 0.7,
    onDelta: (piece) => {
      acc += piece;
      if (onDelta) {
        const visible = extractBackgroundProgress(acc);
        if (visible.length > lastBgLen) {
          onDelta(visible.slice(lastBgLen));
          lastBgLen = visible.length;
        }
      }
    },
  });

  const parsed = BackgroundSchema.safeParse(extractJsonObject(raw));
  if (!parsed.success) throw new Error("Background pass returned no parsed content.");
  if (onDelta && parsed.data.backgroundContent.length > lastBgLen) {
    onDelta(parsed.data.backgroundContent.slice(lastBgLen));
  }
  return parsed.data.backgroundContent;
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

/**
 * Extract whatever text is decodable from the partial JSON of the background
 * stream. Heuristic: find `"backgroundContent": "..."` and unescape what's
 * been emitted so far.
 */
function extractBackgroundProgress(acc: string): string {
  const marker = '"backgroundContent"';
  const idx = acc.indexOf(marker);
  if (idx < 0) return "";
  const colon = acc.indexOf(":", idx + marker.length);
  if (colon < 0) return "";
  const startQuote = acc.indexOf('"', colon + 1);
  if (startQuote < 0) return "";
  let out = "";
  for (let i = startQuote + 1; i < acc.length; i++) {
    const c = acc[i];
    if (c === "\\") {
      const next = acc[i + 1];
      if (next === undefined) break;
      const map: Record<string, string> = {
        n: "\n",
        t: "\t",
        r: "\r",
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
      };
      out += map[next] ?? next;
      i++;
      continue;
    }
    if (c === '"') return out;
    out += c;
  }
  return out;
}

async function generateDecisions(
  input: PipelineInput,
  outline: SimulationOutline
): Promise<DecisionsResult["decisions"]> {
  const system = commonSystem(input, outline);
  const user = `Write the three decision points and their three options each (A, B, C). One option must score 3 (optimal), one 2, one 1. Consequences should be plausible and discipline-specific. Output JSON.

${requestContext(input)}`;

  const parsed = await generateStructured({
    system,
    user,
    schema: DecisionsSchema,
    model: getModel(),
    temperature: 0.7,
  });
  return parsed.decisions;
}

async function generateDataBlocks(
  input: PipelineInput,
  outline: SimulationOutline
): Promise<DataBlocksResult["dataBlocks"]> {
  const system = commonSystem(input, outline);
  const baseUser = `Write the data blocks the student will see. Use the hinted block types if they fit; otherwise pick the best from: table, bar_chart, line_chart, kpi_cards, timeline, pie_chart. Numbers must be plausible and grounded in source materials.

Return a single JSON object of the form { "dataBlocks": [ ... ] } with 1-3 items.
Each item must be: { "block_type": "table"|"bar_chart"|"line_chart"|"kpi_cards"|"timeline"|"pie_chart", "title": string, "data": ... } where data matches the block_type:
- table: { "headers": string[], "rows": string[][] }
- bar_chart: { "labels": string[], "values": number[] }
- line_chart: { "xLabel": string, "series": { "label": string, "data": { "x": string, "y": number }[] }[] }
- kpi_cards: { "items": { "label": string, "value": string, "subtext": string | null }[] }
- timeline: { "events": { "date": string, "title": string, "detail": string | null }[] }
- pie_chart: { "labels": string[], "values": number[] }

Hinted blocks:
${outline.dataBlockHints.map((h, i) => `${i + 1}. ${h.type} — ${h.title} (${h.purpose})`).join("\n")}

${requestContext(input)}`;

  let lastError: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? baseUser
        : `Your previous JSON did not validate: ${lastError}\nReturn corrected JSON only.\n\n${baseUser}`;

    const raw = await generateJsonText({
      system,
      user,
      model: getModel(),
      temperature: 0.7,
    });

    if (!raw) {
      lastError = "Empty response from model";
      continue;
    }
    let parsed: unknown;
    try {
      parsed = extractJsonObject(raw);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue;
    }
    const checked = DataBlocksSchema.safeParse(parsed);
    if (checked.success) {
      return checked.data.dataBlocks;
    }
    lastError = checked.error.message;
  }

  throw new Error(`Data blocks pass failed: ${lastError ?? "unknown error"}`);
}

async function generateReflectionQuestions(
  input: PipelineInput,
  outline: SimulationOutline
): Promise<ReflectionQuestionsResult["reflectionQuestions"]> {
  const system = commonSystem(input, outline);
  const user = `Write exactly 2 reflection questions for after the simulation. They should connect the in-fiction decisions to the learning goal and prompt the student to explain trade-offs in their own words. Output JSON.

${requestContext(input)}`;

  const parsed = await generateStructured({
    system,
    user,
    schema: ReflectionQuestionsSchema,
    model: getModel(),
    temperature: 0.7,
  });
  return parsed.reflectionQuestions;
}

async function generateHiddenProfiles(
  input: PipelineInput,
  outline: SimulationOutline
): Promise<HiddenProfilesResult["hiddenProfiles"]> {
  const system = commonSystem(input, outline);
  const user = `Write exactly 3 distinct hidden student roles for asymmetric play. Each profile_name is short (e.g. "CFO", "Union lead"). Each private_briefing is 1-3 short paragraphs (Markdown allowed) revealing facts, constraints, or incentives only that role sees. Output JSON.

${requestContext(input)}`;

  const parsed = await generateStructured({
    system,
    user,
    schema: HiddenProfilesSchema,
    model: getModel(),
    temperature: 0.7,
  });
  return parsed.hiddenProfiles;
}

// ── Block normalization (legacy compat) ────────────────────────────────────
const VALID_BLOCK_TYPES: DataBlockType[] = [
  "table",
  "bar_chart",
  "line_chart",
  "kpi_cards",
  "timeline",
  "pie_chart",
];

function normalizeDataBlocks(
  blocks: DataBlocksResult["dataBlocks"]
): GeneratedDataBlock[] {
  return blocks
    .filter((b) => VALID_BLOCK_TYPES.includes(b.block_type))
    .slice(0, 5)
    .map((b) => ({
      block_type: b.block_type,
      title: b.title,
      data: b.data as unknown as Record<string, unknown>,
    }));
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Streaming version: yields lifecycle events as parallel sub-calls complete.
 *
 * Order is *not* guaranteed across decisions/dataBlocks/reflections — they
 * race. Background tokens stream while the others run.
 */
export async function* streamSimulationPipeline(
  input: PipelineInput
): AsyncGenerator<StreamEvent> {
  let outline: SimulationOutline;
  try {
    outline = await generateOutline(input);
  } catch (err) {
    yield {
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    };
    return;
  }
  yield { type: "outline", outline };

  const deltaQueue: string[] = [];
  const bgState: { done: boolean; error: Error | null } = {
    done: false,
    error: null,
  };

  const backgroundPromise = generateBackground(input, outline, (delta) => {
    deltaQueue.push(delta);
  })
    .catch((e: unknown) => {
      bgState.error = e instanceof Error ? e : new Error(String(e));
      return "";
    })
    .finally(() => {
      bgState.done = true;
    });

  const decisionsPromise = generateDecisions(input, outline);
  const dataBlocksPromise = generateDataBlocks(input, outline);
  const reflectionsPromise = generateReflectionQuestions(input, outline);
  const hiddenProfilesPromise = input.hiddenProfilesWanted
    ? generateHiddenProfiles(input, outline)
    : Promise.resolve(null);

  // Pump background deltas while the parallel calls run.
  while (!bgState.done || deltaQueue.length > 0) {
    if (deltaQueue.length > 0) {
      const delta = deltaQueue.shift()!;
      yield { type: "background.delta", delta };
    } else {
      // Yield to event loop while the model is still streaming.
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  const background = await backgroundPromise;
  if (bgState.error) {
    yield { type: "error", error: bgState.error.message };
    return;
  }
  yield { type: "background.done", backgroundContent: background };

  // Race the remaining sub-calls and emit each as it lands.
  type Tagged =
    | { kind: "decisions"; value: DecisionsResult["decisions"] }
    | { kind: "dataBlocks"; value: DataBlocksResult["dataBlocks"] }
    | { kind: "reflections"; value: string[] }
    | { kind: "hiddenProfiles"; value: GeneratedHiddenProfile[] | null };

  // Push results into a queue and emit them in arrival order.
  const events: Tagged[] = [];
  const waiters: Array<() => void> = [];
  const wake = () => {
    const w = waiters.shift();
    if (w) w();
  };
  let pending = 0;
  let raceError: unknown = null;

  const push = (e: Tagged) => {
    events.push(e);
    wake();
  };
  const fail = (e: unknown) => {
    raceError = e;
    wake();
  };

  pending++;
  decisionsPromise.then(
    (value) => {
      push({ kind: "decisions", value });
      pending--;
    },
    fail
  );
  pending++;
  dataBlocksPromise.then(
    (value) => {
      push({ kind: "dataBlocks", value });
      pending--;
    },
    fail
  );
  pending++;
  reflectionsPromise.then(
    (value) => {
      push({ kind: "reflections", value });
      pending--;
    },
    fail
  );
  pending++;
  hiddenProfilesPromise.then(
    (value) => {
      push({ kind: "hiddenProfiles", value });
      pending--;
    },
    fail
  );

  const collected: Partial<{
    decisions: DecisionsResult["decisions"];
    dataBlocks: GeneratedDataBlock[];
    reflectionQuestions: string[];
    hiddenProfiles: GeneratedHiddenProfile[];
  }> = {};

  while (pending > 0 || events.length > 0) {
    if (raceError) {
      yield {
        type: "error",
        error:
          raceError instanceof Error ? raceError.message : String(raceError),
      };
      return;
    }
    if (events.length === 0) {
      await new Promise<void>((resolve) => waiters.push(resolve));
      continue;
    }
    const e = events.shift()!;
    if (e.kind === "decisions") {
      collected.decisions = e.value;
      yield { type: "decisions", decisions: e.value };
    } else if (e.kind === "dataBlocks") {
      const normalized = normalizeDataBlocks(e.value);
      collected.dataBlocks = normalized;
      yield { type: "dataBlocks", dataBlocks: normalized };
    } else if (e.kind === "reflections") {
      collected.reflectionQuestions = e.value;
      yield { type: "reflectionQuestions", reflectionQuestions: e.value };
    } else if (e.value) {
      collected.hiddenProfiles = e.value;
      yield { type: "hiddenProfiles", hiddenProfiles: e.value };
    }
  }

  const simulation: GeneratedSimulation = {
    title: outline.title,
    backgroundContent: background,
    dataBlocks: collected.dataBlocks ?? [],
    decisions: collected.decisions ?? [],
    reflectionQuestions: collected.reflectionQuestions ?? [],
    ...(collected.hiddenProfiles
      ? { hiddenProfiles: collected.hiddenProfiles }
      : {}),
  };

  yield { type: "done", simulation };
}

/** Blocking variant: drains the stream and returns the final simulation. */
export async function runSimulationPipelineMerged(
  input: PipelineInput
): Promise<GeneratedSimulation> {
  let result: GeneratedSimulation | null = null;
  for await (const ev of streamSimulationPipeline(input)) {
    if (ev.type === "error") throw new Error(ev.error);
    if (ev.type === "done") result = ev.simulation;
  }
  if (!result) {
    throw new Error("Simulation pipeline finished without producing a result.");
  }
  return result;
}
