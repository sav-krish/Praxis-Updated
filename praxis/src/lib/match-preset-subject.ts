import { ALL_SUBJECTS } from "@/lib/subjects";

const SUBJECT_SET = new Set<string>(ALL_SUBJECTS);
const LOWER_TO_CANONICAL = new Map(
  ALL_SUBJECTS.map((s) => [s.toLowerCase(), s] as const)
);

/** Folder / legacy labels that should map to a canonical preset title */
const TOPIC_ALIASES: Record<string, string> = {
  general: "General Business & Management",
  "general business": "General Business & Management",
  "information & knowledge mangement": "Information & Knowledge Management",
};

/**
 * Map arbitrary folder or model text to the canonical `ALL_SUBJECTS` string used in the UI.
 */
export function matchCourseTopicToPreset(raw: string | undefined): string {
  if (!raw?.trim()) return "Other / Custom";
  const t = raw.trim();
  if (SUBJECT_SET.has(t)) return t;
  const lower = t.toLowerCase();
  const alias = TOPIC_ALIASES[lower];
  if (alias && SUBJECT_SET.has(alias)) return alias;
  const byLower = LOWER_TO_CANONICAL.get(lower);
  if (byLower) return byLower;
  for (const s of ALL_SUBJECTS) {
    const sl = s.toLowerCase();
    if (lower.includes(sl) || sl.includes(lower)) return s;
  }
  return "Other / Custom";
}
