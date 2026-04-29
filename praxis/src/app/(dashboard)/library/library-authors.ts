import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { LibrarySimulationRow } from "@/types/library";

/** SECURITY DEFINER RPC — returns display names only when opted-in + public sim exists. */
export async function fetchLibraryAuthorMap(
  supabase: SupabaseClient<Database>,
  professorIds: string[]
): Promise<Map<string, string | null>> {
  const unique = [...new Set(professorIds)];
  const map = new Map<string, string | null>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.rpc("library_author_display_names", {
    prof_ids: unique,
  });

  if (error) {
    logger.error("library_author_display_names:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.professor_id, row.display_name ?? null);
  }
  return map;
}

export function mergeLibraryRowsWithAuthors(
  rows: unknown[] | null,
  authors: Map<string, string | null>
): LibrarySimulationRow[] {
  return (rows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const pid = row.professor_id as string;
    const label = authors.get(pid);
    const disclosed =
      typeof label === "string" && label.trim().length > 0 ? label.trim() : null;
    return {
      id: row.id as string,
      title: row.title as string,
      course_topic: row.course_topic as string,
      difficulty: (row.difficulty as string | null) ?? null,
      estimated_minutes: (row.estimated_minutes as number | null) ?? null,
      favorite_count: (row.favorite_count as number) ?? 0,
      professor_id: pid,
      created_at: row.created_at as string,
      is_pinned: Boolean(row.is_pinned),
      pinned_order: (row.pinned_order as number | null) ?? null,
      professors: disclosed ? { name: disclosed } : null,
    };
  });
}
