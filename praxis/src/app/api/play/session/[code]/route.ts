import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { maybeRebalanceSessionTeams } from "@/lib/team-assignment";

const SESSION_SIMULATION_SELECT =
  `
    id,
    status,
    current_step,
    is_preview,
    simulation:simulations(id, title, background_content, mode, team_assignment, team_size, justification_type, estimated_minutes, hidden_profiles_enabled, preferences)
  ` as const;

const SESSION_SIMULATION_SELECT_LEGACY =
  `
    id,
    status,
    current_step,
    is_preview,
    simulation:simulations(id, title, background_content, mode, team_assignment, team_size, estimated_minutes, hidden_profiles_enabled, preferences)
  ` as const;

interface RouteContext {
  params: Promise<{ code: string }>;
}

type TeamRow = { id: string; name: string };

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
        team_assignment?: "auto" | "self" | null;
        team_size?: number | null;
        justification_type: "written" | "video" | "video_or_text";
        estimated_minutes?: number | null;
        hidden_profiles_enabled?: boolean;
        preferences?: Json;
      }
    | null;

  if (!simulationData?.id) {
    return NextResponse.json({ error: "Simulation data unavailable" }, { status: 404 });
  }

  await maybeRebalanceSessionTeams(
    sessionData.id,
    {
      mode: simulationData.mode as "individual" | "teams",
      team_assignment: simulationData.team_assignment ?? null,
      team_size: simulationData.team_size ?? null,
    },
    supabase
  );

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
          .select("id, name, profile_id, team_id, is_voter")
          .eq("id", participantId)
          .eq("session_id", sessionData.id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (participantId && !participantResult.data) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  let participantData = participantResult.data;

  if (
    participantId &&
    simulationData.mode === "teams" &&
    simulationData.team_assignment !== "self" &&
    participantData &&
    !participantData.team_id
  ) {
    await maybeRebalanceSessionTeams(
      sessionData.id,
      {
        mode: simulationData.mode as "individual" | "teams",
        team_assignment: simulationData.team_assignment ?? null,
        team_size: simulationData.team_size ?? null,
      },
      supabase
    );

    const { data: refreshedParticipant } = await supabase
      .from("participants")
      .select("id, name, profile_id, team_id, is_voter")
      .eq("id", participantId)
      .eq("session_id", sessionData.id)
      .single();

    if (refreshedParticipant) {
      participantData = refreshedParticipant;
    }
  }

  const playerProfileId = participantData?.profile_id ?? null;
  const participantTeamId = participantData?.team_id ?? null;
  const [{ data: decisionsData }, { data: questionsData }, { data: blocksData }, { data: sourcesData }, { data: scenarioImgData }, { data: responsesData }, { data: teamDecisionData }, { data: teamMembersData }, { data: teamData }, profileResult, availableProfilesResult] = await Promise.all([
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
    simulationData.mode === "teams" && participantTeamId
      ? supabase
          .from("team_decision_submissions")
          .select("id, team_id, decision_id, option_id, submitted_at")
          .eq("session_id", sessionData.id)
          .eq("team_id", participantTeamId)
      : Promise.resolve({ data: [], error: null }),
    simulationData.mode === "teams" && participantTeamId
      ? supabase
          .from("teams")
          .select("id, name")
          .eq("id", participantTeamId)
          .single()
      : Promise.resolve({ data: null, error: null }),
    simulationData.mode === "teams" && participantTeamId
      ? supabase
          .from("participants")
          .select("id, name, team_id, is_voter")
          .eq("session_id", sessionData.id)
          .eq("team_id", participantTeamId)
          .order("joined_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    playerProfileId
      ? supabase
          .from("simulation_profiles")
          .select("profile_name, private_briefing")
          .eq("id", playerProfileId)
          .single()
      : Promise.resolve({ data: null, error: null }),
    simulationData.hidden_profiles_enabled
      ? supabase
          .from("simulation_profiles")
          .select("id, profile_name")
          .eq("simulation_id", simulationData.id)
          .order("order_num", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  return NextResponse.json({
    session: sessionPayload,
    participantCount: count ?? 0,
    participant: participantData
      ? {
          id: participantData.id,
          name: participantData.name,
          profile_id: participantData.profile_id,
          team_id: participantData.team_id,
          is_voter: participantData.is_voter,
        }
      : null,
    team: participantTeamId
      ? {
          id: participantTeamId,
          name: (teamData as TeamRow | null)?.name ?? "Team",
          members: teamMembersData ?? [],
        }
      : null,
    teamDecisions: teamDecisionData ?? [],
    playerProfile: profileResult.data ?? null,
    availableProfiles: availableProfilesResult.data ?? [],
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

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { code } = await params;
  const body = (await request.json().catch(() => null)) as
    | { participantId?: string; profileId?: string }
    | null;
  const participantId = body?.participantId?.trim();
  const profileId = body?.profileId?.trim();

  if (!participantId || !profileId) {
    return NextResponse.json({ error: "Participant and role are required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, simulation_id, simulation:simulations(hidden_profiles_enabled)")
    .eq("join_code", code.toUpperCase())
    .single();

  const simulation = session?.simulation as { hidden_profiles_enabled?: boolean } | null;
  if (!session || !simulation?.hidden_profiles_enabled) {
    return NextResponse.json({ error: "Roles are not enabled for this simulation" }, { status: 404 });
  }

  const [{ data: participant }, { data: profile }] = await Promise.all([
    supabase
      .from("participants")
      .select("id")
      .eq("id", participantId)
      .eq("session_id", session.id)
      .single(),
    supabase
      .from("simulation_profiles")
      .select("id")
      .eq("id", profileId)
      .eq("simulation_id", session.simulation_id)
      .single(),
  ]);

  if (!participant || !profile) {
    return NextResponse.json({ error: "Participant or role not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("participants")
    .update({ profile_id: profile.id })
    .eq("id", participant.id);

  if (error) {
    return NextResponse.json({ error: "Could not assign role" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
