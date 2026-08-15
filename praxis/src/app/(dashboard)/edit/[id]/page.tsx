import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SimulationDataBlock } from "@/types/data-blocks";
import { SimulationEditorDynamic } from "./simulation-editor-dynamic";
import {
  SIMULATION_EDITOR_ROW,
  REFLECTION_QUESTION_EDITOR_ROW,
  SIMULATION_DATA_BLOCK_EDITOR_ROW,
  SIMULATION_PROFILE_EDITOR_ROW,
  SIMULATION_SOURCE_EDITOR_ROW,
  SIMULATION_SCENARIO_IMAGE_ROW,
} from "@/lib/supabase-query-columns";

const SIMULATION_EDITOR_ROW_LEGACY =
  "id, professor_id, title, course_topic, goal, target_decisions, background_content, ai_notes, mode, team_size, team_assignment, difficulty, estimated_minutes, status, preferences, is_public, favorite_count, hidden_profiles_enabled, is_pinned, pinned_order, created_at, updated_at" as const;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function EditSimulationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { generated } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (studentProfile) redirect("/dashboard");
  }

  // Fetch simulation with all related data
  let { data: simulation, error } = await supabase
    .from("simulations")
    .select(SIMULATION_EDITOR_ROW)
    .eq("id", id)
    .single();

  if (error?.message?.includes("justification_type")) {
    const legacyResult = await supabase
      .from("simulations")
      .select(SIMULATION_EDITOR_ROW_LEGACY)
      .eq("id", id)
      .single();

    simulation = legacyResult.data
      ? { ...legacyResult.data, justification_type: "written" as const }
      : null;
    error = legacyResult.error;
  }

  if (error || !simulation) {
    notFound();
  }

  const isOwner = !!user && simulation.professor_id === user.id;

  // Fetch decisions with options
  const { data: decisions } = await supabase
    .from("decisions")
    .select(`
      *,
      options (*)
    `)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch reflection questions
  const { data: reflectionQuestions } = await supabase
    .from("reflection_questions")
    .select(REFLECTION_QUESTION_EDITOR_ROW)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch data blocks
  const { data: dataBlocks } = await supabase
    .from("simulation_data_blocks")
    .select(SIMULATION_DATA_BLOCK_EDITOR_ROW)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch hidden profiles
  const { data: profiles } = await supabase
    .from("simulation_profiles")
    .select(SIMULATION_PROFILE_EDITOR_ROW)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch sources
  const { data: sources } = await supabase
    .from("simulation_sources")
    .select(SIMULATION_SOURCE_EDITOR_ROW)
    .eq("simulation_id", id)
    .order("created_at", { ascending: true });

  const { data: scenarioImages } = await supabase
    .from("simulation_scenario_images")
    .select(SIMULATION_SCENARIO_IMAGE_ROW)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  const { data: activeSessions } = await supabase
    .from("sessions")
    .select("id, join_code, status, created_at")
    .eq("simulation_id", id)
    .neq("status", "complete")
    .neq("is_preview", true)
    .order("created_at", { ascending: false });

  const { data: studentAttemptSessions } = (activeSessions?.length ?? 0) > 0
    ? await supabase
        .from("student_simulation_attempts")
        .select("session_id")
        .in("session_id", activeSessions!.map((session) => session.id))
    : { data: [] as { session_id: string }[] };
  const studentAttemptSessionIds = new Set(
    studentAttemptSessions?.map((attempt) => attempt.session_id) ?? [],
  );
  const activeSession = activeSessions?.find(
    (session) => !studentAttemptSessionIds.has(session.id),
  );

  // Sort options within each decision
  const sortedDecisions = decisions?.map(d => ({
    ...d,
    options: d.options.sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
  })) || [];

  return (
    <SimulationEditorDynamic
      simulation={simulation}
      decisions={sortedDecisions}
      reflectionQuestions={reflectionQuestions || []}
      dataBlocks={(dataBlocks || []).map((b) => ({ ...b, block_type: b.block_type as SimulationDataBlock["block_type"], data: b.data as unknown as SimulationDataBlock["data"] }))}
      profiles={profiles || []}
      sources={(sources || []).map((s) => ({
        ...s,
        source_type: s.source_type as "file" | "url" | "text" | "manual",
      }))}
      scenarioImages={scenarioImages || []}
      activeSession={activeSession || undefined}
      userId={user?.id}
      isNewlyGenerated={generated === "1"}
      isOwner={isOwner}
    />
  );
}
