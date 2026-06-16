import { notFound } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { SessionLobby } from "./session-lobby";
import { maybeRebalanceSessionTeams } from "@/lib/team-assignment";
import {
  SESSION_LOBBY_ROW,
  SESSION_LOBBY_SIMULATION,
  PARTICIPANT_LOBBY_ROW,
  TEAM_LOBBY_ROW,
  SIMULATION_PROFILE_LOBBY_ROW,
} from "@/lib/supabase-query-columns";

interface PageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function SessionPage({ params }: PageProps) {
  const { id, sessionId } = await params;
  const supabase = await createClient();

  // Fetch session with simulation
  const result = await supabase
    .from("sessions")
    .select(`
      ${SESSION_LOBBY_ROW},
      simulation:simulations(${SESSION_LOBBY_SIMULATION})
    `)
    .eq("id", sessionId)
    .single();

  let session = result.data;
  let error = result.error;

  if (
    error?.message?.includes("video_gallery_share_id") ||
    error?.message?.includes("response_gallery_access_code")
  ) {
    const legacyResult = await supabase
      .from("sessions")
      .select(`
        id, simulation_id, join_code, status, current_step, started_at, ended_at, debrief_guide, is_preview, created_at,
        simulation:simulations(${SESSION_LOBBY_SIMULATION})
      `)
      .eq("id", sessionId)
      .single();

    session = legacyResult.data
      ? {
          ...legacyResult.data,
          video_gallery_share_id: sessionId,
          response_gallery_access_code: legacyResult.data.join_code,
        }
      : null;
    error = legacyResult.error;
  }

  if (error || !session) {
    notFound();
  }

  await maybeRebalanceSessionTeams(
    sessionId,
    {
      mode: session.simulation.mode,
      team_assignment: session.simulation.team_assignment ?? null,
      team_size: session.simulation.team_size ?? null,
    },
    createServiceRoleClient()
  ).catch(() => null);

  // Fetch participants
  const { data: participants } = await supabase
    .from("participants")
    .select(PARTICIPANT_LOBBY_ROW)
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  // Fetch teams if team mode
  const { data: teams } = await supabase
    .from("teams")
    .select(TEAM_LOBBY_ROW)
    .eq("session_id", sessionId);

  // Fetch decisions for progress tracking
  const { data: decisions } = await supabase
    .from("decisions")
    .select("id")
    .eq("simulation_id", id);

  // Fetch responses count
  const { data: responses } = await supabase
    .from("responses")
    .select("decision_id, participant_id, team_id")
    .eq("session_id", sessionId);

  // Fetch hidden profiles
  const { data: profiles } = await supabase
    .from("simulation_profiles")
    .select(SIMULATION_PROFILE_LOBBY_ROW)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  return (
    <SessionLobby
      session={session}
      simulation={session.simulation}
      participants={participants || []}
      teams={teams || []}
      decisions={decisions || []}
      responses={responses || []}
      profiles={profiles || []}
    />
  );
}
