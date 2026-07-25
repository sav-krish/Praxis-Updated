import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { maybeRebalanceSessionTeams } from "@/lib/team-assignment";
import {
  getLiveConsequenceSnapshot,
  getSimulationFlowSettings,
  setLiveConsequenceSnapshot,
} from "@/lib/simulation-flow";

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

  let liveConsequenceSnapshot = getLiveConsequenceSnapshot(
    simulationData.preferences,
    sessionData.id,
  );
  if (!liveConsequenceSnapshot && sessionData.status === "running") {
    liveConsequenceSnapshot = Object.fromEntries(
      (decisionsData ?? []).flatMap((decision) =>
        decision.options.map((option) => [option.id, option.consequence] as const),
      ),
    );
    simulationData.preferences = setLiveConsequenceSnapshot(
      simulationData.preferences,
      sessionData.id,
      liveConsequenceSnapshot,
    );
    await supabase
      .from("simulations")
      .update({ preferences: simulationData.preferences })
      .eq("id", simulationData.id);
  }

  const flowSettings = getSimulationFlowSettings(simulationData.preferences);
  const finalDecision = decisionsData?.at(-1);
  const participantFinished =
    (responsesData?.length ?? 0) >= (decisionsData?.length ?? 0);
  let classVotes: {
    decisionId: string;
    totalSubmitted: number;
    totalEligible: number;
    optionIds: string[];
    leaderboard: Array<{
      id: string;
      name: string;
      score: number;
      isCurrent: boolean;
    }>;
  } | null = null;

  if (flowSettings.classVotesEnabled && participantFinished && finalDecision) {
    const [voteResult, eligibilityResult] = await Promise.all([
      simulationData.mode === "teams"
        ? supabase
            .from("team_decision_submissions")
            .select("option_id")
            .eq("session_id", sessionData.id)
            .eq("decision_id", finalDecision.id)
        : supabase
            .from("responses")
            .select("option_id")
            .eq("session_id", sessionData.id)
            .eq("decision_id", finalDecision.id),
      simulationData.mode === "teams"
        ? supabase
            .from("teams")
            .select("*", { count: "exact", head: true })
            .eq("session_id", sessionData.id)
        : Promise.resolve({ count: count ?? 0 }),
    ]);
    const optionIds = (voteResult.data ?? []).map((vote) => vote.option_id);
    const optionScore = new Map(
      (decisionsData ?? []).flatMap((decision) =>
        decision.options.map((option) => [option.id, option.score ?? 0] as const),
      ),
    );
    const leaderboard =
      simulationData.mode === "teams"
        ? await (async () => {
            const [{ data: submissions }, { data: teams }] = await Promise.all([
              supabase
                .from("team_decision_submissions")
                .select("team_id, option_id")
                .eq("session_id", sessionData.id),
              supabase
                .from("teams")
                .select("id, name")
                .eq("session_id", sessionData.id),
            ]);
            const scores = new Map<string, number>();
            for (const submission of submissions ?? []) {
              scores.set(
                submission.team_id,
                (scores.get(submission.team_id) ?? 0) +
                  (optionScore.get(submission.option_id) ?? 0),
              );
            }
            return (teams ?? []).map((team) => ({
              id: team.id,
              name: team.name,
              score: scores.get(team.id) ?? 0,
              isCurrent: team.id === participantTeamId,
            }));
          })()
        : await (async () => {
            const [{ data: responses }, { data: participants }] = await Promise.all([
              supabase
                .from("responses")
                .select("participant_id, option_id")
                .eq("session_id", sessionData.id),
              supabase
                .from("participants")
                .select("id, name")
                .eq("session_id", sessionData.id),
            ]);
            const scores = new Map<string, number>();
            for (const response of responses ?? []) {
              if (!response.participant_id) continue;
              scores.set(
                response.participant_id,
                (scores.get(response.participant_id) ?? 0) +
                  (optionScore.get(response.option_id) ?? 0),
              );
            }
            return (participants ?? []).map((participant) => ({
              id: participant.id,
              name: participant.name,
              score: scores.get(participant.id) ?? 0,
              isCurrent: participant.id === participantId,
            }));
          })();
    classVotes = {
      decisionId: finalDecision.id,
      totalSubmitted: optionIds.length,
      totalEligible: eligibilityResult.count ?? 0,
      optionIds,
      leaderboard: leaderboard
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, 10),
    };
  }

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
      options: [...decision.options]
        .map((option) => ({
          ...option,
          consequence:
            liveConsequenceSnapshot &&
            Object.prototype.hasOwnProperty.call(liveConsequenceSnapshot, option.id)
              ? liveConsequenceSnapshot[option.id]
              : option.consequence,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    })),
    classVotes,
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
