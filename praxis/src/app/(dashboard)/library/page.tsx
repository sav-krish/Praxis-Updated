import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { LibraryView } from "./library-view";
import type { LibrarySimulationRow } from "@/types/library";
import { escapeIlikePattern } from "@/lib/utils";
import { flagshipSimulations, sortLibrarySimulations } from "@/lib/library-sort";
import { fetchLibraryAuthorMap, mergeLibraryRowsWithAuthors } from "./library-authors";

interface LibraryPageProps {
  searchParams: Promise<{ q?: string; subject?: string; difficulty?: string }>;
}

const LIBRARY_SIM_COLUMNS =
  "id, title, course_topic, difficulty, estimated_minutes, favorite_count, professor_id, created_at, is_pinned, pinned_order" as const;

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { q, subject, difficulty } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = await isAdmin(user ?? null);

  const qTrim = (q ?? "").trim();
  const hasFilters =
    qTrim.length > 0 ||
    (subject && subject !== "all") ||
    (difficulty && difficulty !== "all");

  let simulations: LibrarySimulationRow[];
  let flagship: LibrarySimulationRow[];
  let topSimulations: LibrarySimulationRow[];
  let subjects: string[];

  if (!hasFilters) {
    const { data: rows } = await supabase
      .from("simulations")
      .select(LIBRARY_SIM_COLUMNS)
      .eq("is_public", true);

    const profIds = (rows ?? []).map((r) => r.professor_id);
    const authors = await fetchLibraryAuthorMap(supabase, profIds);
    const list = mergeLibraryRowsWithAuthors(rows, authors);
    simulations = sortLibrarySimulations(list);
    flagship = flagshipSimulations(simulations);
    topSimulations = simulations
      .filter((s) => s.favorite_count > 0 && !s.is_pinned)
      .slice(0, 10);
    subjects = Array.from(
      new Set(list.map((s) => s.course_topic).filter(Boolean))
    ).sort() as string[];
  } else {
    let filtered = supabase.from("simulations").select(LIBRARY_SIM_COLUMNS).eq("is_public", true);

    if (subject && subject !== "all") {
      filtered = filtered.eq("course_topic", subject);
    }
    if (difficulty && difficulty !== "all") {
      filtered = filtered.eq("difficulty", difficulty as "easy" | "hard" | "challenge");
    }
    if (qTrim) {
      const safe = escapeIlikePattern(qTrim);
      filtered = filtered.or(
        `title.ilike.%${safe}%,course_topic.ilike.%${safe}%`
      );
    }

    const [simsRes, topRes, topicsRes] = await Promise.all([
      filtered,
      supabase
        .from("simulations")
        .select(LIBRARY_SIM_COLUMNS)
        .eq("is_public", true)
        .gt("favorite_count", 0),
      supabase.from("simulations").select("course_topic").eq("is_public", true),
    ]);

    const mergedProfIds = [
      ...(simsRes.data ?? []).map((r) => r.professor_id),
      ...(topRes.data ?? []).map((r) => r.professor_id),
    ];
    const authors = await fetchLibraryAuthorMap(supabase, mergedProfIds);

    const filteredList = mergeLibraryRowsWithAuthors(simsRes.data, authors);
    simulations = sortLibrarySimulations(filteredList);
    flagship = flagshipSimulations(simulations);
    topSimulations = sortLibrarySimulations(mergeLibraryRowsWithAuthors(topRes.data, authors))
      .filter((s) => s.favorite_count > 0 && !s.is_pinned)
      .slice(0, 10);
    subjects = Array.from(
      new Set((topicsRes.data ?? []).map((s) => s.course_topic).filter(Boolean))
    ).sort() as string[];
  }

  let userFavoriteIds: string[] = [];
  if (user) {
    const { data: favorites } = await supabase
      .from("simulation_favorites")
      .select("simulation_id")
      .eq("user_id", user.id);
    userFavoriteIds = favorites?.map((f) => f.simulation_id) || [];
  }

  return (
    <LibraryView
      simulations={simulations}
      flagshipSimulations={flagship}
      topSimulations={topSimulations}
      userFavoriteIds={userFavoriteIds}
      subjects={subjects}
      userId={user?.id}
      isAdmin={admin}
      currentQuery={q || ""}
      currentSubject={subject || "all"}
      currentDifficulty={difficulty || "all"}
    />
  );
}
