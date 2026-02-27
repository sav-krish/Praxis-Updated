import { createClient } from "@/lib/supabase/server";
import { LibraryView } from "./library-view";

interface LibraryPageProps {
  searchParams: Promise<{ q?: string; subject?: string; difficulty?: string }>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { q, subject, difficulty } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("simulations")
    .select("id, title, course_topic, difficulty, estimated_minutes, favorite_count, professor_id, created_at, professors(name)")
    .eq("is_public", true)
    .order("favorite_count", { ascending: false });

  if (subject && subject !== "all") {
    query = query.eq("course_topic", subject);
  }
  if (difficulty && difficulty !== "all") {
    query = query.eq("difficulty", difficulty as "easy" | "hard" | "challenge");
  }
  if (q) {
    query = query.or(`title.ilike.%${q}%,course_topic.ilike.%${q}%`);
  }

  const { data: simulations } = await query;

  // Top simulations (highest favorites, separate query without search filters)
  const { data: topSimulations } = await supabase
    .from("simulations")
    .select("id, title, course_topic, difficulty, estimated_minutes, favorite_count, professor_id, created_at, professors(name)")
    .eq("is_public", true)
    .gt("favorite_count", 0)
    .order("favorite_count", { ascending: false })
    .limit(10);

  // Get user's favorites
  let userFavoriteIds: string[] = [];
  if (user) {
    const { data: favorites } = await supabase
      .from("simulation_favorites")
      .select("simulation_id")
      .eq("user_id", user.id);
    userFavoriteIds = favorites?.map((f) => f.simulation_id) || [];
  }

  // Unique subjects for filter dropdown
  const { data: allPublic } = await supabase
    .from("simulations")
    .select("course_topic")
    .eq("is_public", true);
  const subjects = Array.from(new Set((allPublic || []).map((s) => s.course_topic).filter(Boolean))).sort();

  return (
    <LibraryView
      simulations={simulations || []}
      topSimulations={topSimulations || []}
      userFavoriteIds={userFavoriteIds}
      subjects={subjects as string[]}
      userId={user?.id}
      currentQuery={q || ""}
      currentSubject={subject || "all"}
      currentDifficulty={difficulty || "all"}
    />
  );
}
