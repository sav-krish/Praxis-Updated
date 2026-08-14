/**
 * Zod schemas for the simulation generation pipeline.
 *
 * Each schema is deliberately strict — OpenAI's `json_schema` strict mode rejects
 * unknown keys and missing required fields, eliminating the post-generation
 * validation/retry path the legacy generator needed.
 *
 * Note: OpenAI strict mode requires:
 *   - all keys in `additionalProperties: false`
 *   - all keys present in `required` (use `.nullable()` for optional values)
 * `zodResponseFormat` (openai/helpers/zod) handles this when generating the
 * JSON Schema, but we still keep schemas conservative.
 */
import { z } from "zod";
import { ALL_SUBJECTS } from "@/lib/subjects";
import {
  SIMULATION_ASSESSMENT_OPTIONS,
  SIMULATION_FOCUS_OPTIONS,
  SIMULATION_INTERACTION_OPTIONS,
  SIMULATION_STYLE_OPTIONS,
} from "@/lib/simulation-metadata-presets";

// ── Outline ─────────────────────────────────────────────────────────────────
export const OutlineSchema = z.object({
  title: z
    .string()
    .describe("Short, vivid simulation title (5-12 words). Use spaces between words like a readable course title, not slug-style hyphens."),
  oneLineFraming: z
    .string()
    .describe("One-sentence framing of the dilemma students will face."),
  protagonistRole: z
    .string()
    .describe("Who the student plays (e.g. 'CMO of a Series-D hardware brand')."),
  decisionStems: z
    .array(z.string())
    .length(3)
    .describe("Three short decision prompts (one sentence each)."),
  dataBlockHints: z
    .array(
      z.object({
        type: z.enum([
          "table",
          "bar_chart",
          "line_chart",
          "kpi_cards",
          "timeline",
          "pie_chart",
        ]),
        title: z.string(),
        purpose: z.string(),
      })
    )
    .min(1)
    .max(3)
    .describe("1-3 data blocks that grounded the scenario."),
});
export type SimulationOutline = z.infer<typeof OutlineSchema>;

// ── Background ─────────────────────────────────────────────────────────────
export const BackgroundSchema = z.object({
  backgroundContent: z
    .string()
    .describe(
      "1-2 page narrative for the student. Use GitHub-Flavored Markdown: ## headings, **bold**, and - bullet lists where helpful. Do not wrap the whole text in a code fence. Put real markdown in the JSON string (do not escape asterisks into visible backslashes). Reference data blocks where useful."
    ),
});
export type BackgroundResult = z.infer<typeof BackgroundSchema>;

// ── Decisions ───────────────────────────────────────────────────────────────
export const OptionSchema = z.object({
  label: z.enum(["A", "B", "C"]),
  title: z.string().describe("Short option title (3-7 words)."),
  description: z
    .string()
    .describe("1-3 sentences explaining the option in concrete terms."),
  consequence: z
    .string()
    .describe("1-2 sentences describing the realistic short-term consequence."),
  score: z
    .union([z.literal(1), z.literal(2), z.literal(2.5), z.literal(3)])
    .describe("3 = Perfect, 2.5 = Good, 2 = Decent, 1 = Poor."),
});

export const DecisionSchema = z.object({
  prompt: z.string(),
  options: z.array(OptionSchema).length(3),
});

export const DecisionsSchema = z.object({
  decisions: z.array(DecisionSchema).length(3),
});
export type DecisionsResult = z.infer<typeof DecisionsSchema>;

// ── Data blocks ────────────────────────────────────────────────────────────
//
// The Supabase `simulation_data_blocks.data` column is JSONB and varies
// dramatically by `block_type`. To keep the schema strict-mode-compatible we
// require each known shape and let the application normalize.
const TableData = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});
const BarChartData = z.object({
  labels: z.array(z.string()),
  values: z.array(z.number()),
});
const LineChartData = z.object({
  xLabel: z.string(),
  series: z.array(
    z.object({
      label: z.string(),
      data: z.array(z.object({ x: z.string(), y: z.number() })),
    })
  ),
});
const KpiCardsData = z.object({
  items: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      subtext: z.string().nullable(),
    })
  ),
});
const TimelineData = z.object({
  events: z.array(
    z.object({
      date: z.string(),
      title: z.string(),
      detail: z.string().nullable(),
    })
  ),
});
const PieChartData = z.object({
  labels: z.array(z.string()),
  values: z.array(z.number()),
});

export const DataBlockSchema = z.discriminatedUnion("block_type", [
  z.object({ block_type: z.literal("table"), title: z.string(), data: TableData }),
  z.object({
    block_type: z.literal("bar_chart"),
    title: z.string(),
    data: BarChartData,
  }),
  z.object({
    block_type: z.literal("line_chart"),
    title: z.string(),
    data: LineChartData,
  }),
  z.object({
    block_type: z.literal("kpi_cards"),
    title: z.string(),
    data: KpiCardsData,
  }),
  z.object({
    block_type: z.literal("timeline"),
    title: z.string(),
    data: TimelineData,
  }),
  z.object({
    block_type: z.literal("pie_chart"),
    title: z.string(),
    data: PieChartData,
  }),
]);

export const DataBlocksSchema = z.object({
  dataBlocks: z.array(DataBlockSchema).min(1).max(3),
});
export type DataBlocksResult = z.infer<typeof DataBlocksSchema>;

// ── Reflection questions ───────────────────────────────────────────────────
export const ReflectionQuestionsSchema = z.object({
  reflectionQuestions: z.array(z.string()).length(2),
});
export type ReflectionQuestionsResult = z.infer<typeof ReflectionQuestionsSchema>;

// ── Hidden profiles (optional second pass when toggled on) ─────────────────
export const HiddenProfilesSchema = z.object({
  hiddenProfiles: z
    .array(
      z.object({
        profile_name: z.string(),
        private_briefing: z.string(),
      })
    )
    .length(3),
});
export type HiddenProfilesResult = z.infer<typeof HiddenProfilesSchema>;

// ── Bulk import: infer title / subject / tags from folder layout + case text ─

const PRESET_COURSE_TOPIC = z.enum(ALL_SUBJECTS as unknown as [string, ...string[]]);

const BulkPrefStyle = z.enum(
  SIMULATION_STYLE_OPTIONS as unknown as [string, ...string[]]
);
const BulkPrefInteraction = z.enum(
  SIMULATION_INTERACTION_OPTIONS as unknown as [string, ...string[]]
);
const BulkPrefFocus = z.enum(SIMULATION_FOCUS_OPTIONS as unknown as [string, ...string[]]);
const BulkPrefAssessment = z.enum(
  SIMULATION_ASSESSMENT_OPTIONS as unknown as [string, ...string[]]
);

export const BulkCaseMetadataInferSchema = z.object({
  title: z
    .string()
    .describe(
      "Simulation title shown to instructors. Combine the file name clue with the case; omit file extensions."
    ),
  courseTopic: PRESET_COURSE_TOPIC.describe(
    "MUST be exactly one string from the approved subject list in the user message — same options as the Praxis subject dropdown."
  ),
  goal: z
    .string()
    .describe("1–3 sentences: learning outcome for this run (what students should practice or understand)."),
  targetDecisions: z
    .string()
    .describe(
      "1–3 sentences: the kinds of decisions or tradeoffs the simulation should surface from this case."
    ),
  aiNotes: z
    .string()
    .nullable()
    .describe("Optional extra instructions for the main generator after this planning step; null if none."),
  difficulty: z
    .enum(["easy", "hard", "challenge"])
    .nullable()
    .describe(
      "Simulation length tier: easy ~15 min (lighter case), hard ~25 min (standard), challenge ~40 min (dense, many stakeholders, or deep technical tradeoffs). Pick from the case content; null only if you truly cannot judge from the path and excerpt."
    ),
  ragSubject: PRESET_COURSE_TOPIC.nullable().describe(
    "Optional knowledge-base filter: use ONLY a value from the same approved list, or null if unsure."
  ),
  preferences: z.object({
    style: z
      .array(BulkPrefStyle)
      .max(3)
      .describe("0–3 tags; each value MUST be exactly one of the Style options listed by the user."),
    interaction: z
      .array(BulkPrefInteraction)
      .max(3)
      .describe("0–3 tags from the Interaction options list only."),
    focus: z
      .array(BulkPrefFocus)
      .max(3)
      .describe("0–3 tags from the Focus options list only."),
    assessment: z
      .array(BulkPrefAssessment)
      .max(3)
      .describe("0–3 tags from the Assessment options list only."),
  }),
});
export type BulkCaseMetadataInfer = z.infer<typeof BulkCaseMetadataInferSchema>;
