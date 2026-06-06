import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const SESSION_SIMULATION_SELECT =
  `
    id,
    status,
    current_step,
    is_preview,
    simulation:simulations(id, title, background_content, mode, justification_type, estimated_minutes, hidden_profiles_enabled, preferences)
  ` as const;

const SESSION_SIMULATION_SELECT_LEGACY =
  `
    id,
    status,
    current_step,
    is_preview,
    simulation:simulations(id, title, background_content, mode, estimated_minutes, hidden_profiles_enabled, preferences)
  ` as const;

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { code } = await params;
  const participantId = request.nextUrl.searchParams.get("participantId");
  const supabase = createServiceRoleClient();

  let { data: sessionData, error } = await supabase
    .from("sessions")
    .select(SESSION_SIMULATION_SELECT)
    .eq("join_code", code.toUpperCase())
    .single();

  if (error?.message?.includes("justification_type")) {
    const legacyResult = await supabase
      .from("sessions")
      .select(SESSION_SIMULATION_SELECT_LEGACY)
      .eq("join_code", code.toUpperCase())
      .single();
    sessionData = (legacyResult.data
      ? {
          ...legacyResult.data,
          simulation: legacyResult.data.simulation
            ? {
                ...(legacyResult.data.simulation as Record<string, unknown>),
                justification_type: "written",
              }
            : null,
        }
      : null) as typeof sessionData;
    error = legacyResult.error;
  }

  if (error || !sessionData) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const simulationData = sessionData.simulation as
    | {
        id: string;
        title: string;
        background_content: string | null;
        mode: string;
        justification_type: "written" | "video" | "video_or_text";
        estimated_minutes?: number | null;
        hidden_profiles_enabled?: boolean;
        preferences?: Json;
      }
    | null;

  if (!simulationData?.id) {
    return NextResponse.json({ error: "Simulation data unavailable" }, { status: 404 });
  }

  const sessionPayload = {
    id: sessionData.id,
    status: sessionData.status,
    current_step: sessionData.current_step,
    is_preview: (sessionData as { is_preview?: boolean }).is_preview ?? false,
    simulation: simulationData,
  };

  const [{ count }, participantResult] = await Promise.all([
    supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionData.id),
    participantId
      ? supabase
          .from("participants")
          .select("id, name, profile_id")
          .eq("id", participantId)
          .eq("session_id", sessionData.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (participantId && !participantResult.data) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  const playerProfileId = participantResult.data?.profile_id ?? null;
  const [{ data: decisionsData }, { data: questionsData }, { data: blocksData }, { data: sourcesData }, { data: scenarioImgData }, { data: responsesData }, profileResult] = await Promise.all([
    supabase
      .from("decisions")
      .select("id, order_num, prompt, options(id, label, title, description, consequence, score)")
      .eq("simulation_id", simulationData.id)
      .order("order_num", { ascending: true }),
    supabase
      .from("reflection_questions")
      .select("*")
      .eq("simulation_id", simulationData.id)
      .order("order_num", { ascending: true }),
    supabase
      .from("simulation_data_blocks")
      .select("id, block_type, title, data")
      .eq("simulation_id", simulationData.id)
      .order("order_num", { ascending: true }),
    supabase
      .from("simulation_sources")
      .select("id, label, url, source_type")
      .eq("simulation_id", simulationData.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("simulation_scenario_images")
      .select("id, storage_path, alt_text, order_num")
      .eq("simulation_id", simulationData.id)
      .order("order_num", { ascending: true }),
    participantId
      ? supabase
          .from("responses")
          .select("decision_id, option_id")
          .eq("session_id", sessionData.id)
          .eq("participant_id", participantId)
      : Promise.resolve({ data: [], error: null }),
    playerProfileId
      ? supabase
          .from("simulation_profiles")
          .select("profile_name, private_briefing")
          .eq("id", playerProfileId)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return NextResponse.json({
    session: sessionPayload,
    participantCount: count ?? 0,
    participant: participantResult.data
      ? {
          id: participantResult.data.id,
          name: participantResult.data.name,
          profile_id: participantResult.data.profile_id,
        }
      : null,
    playerProfile: profileResult.data ?? null,
    decisions: (decisionsData ?? []).map((decision) => ({
      ...decision,
      options: [...decision.options].sort((a, b) => a.label.localeCompare(b.label)),
    })),
    reflectionQuestions: questionsData ?? [],
    dataBlocks: blocksData ?? [],
    sources: sourcesData ?? [],
    scenarioImages: scenarioImgData ?? [],
    responses: responsesData ?? [],
  });
}
