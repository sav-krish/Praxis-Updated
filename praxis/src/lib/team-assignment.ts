import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

export async function rebalanceAutoTeamsForSession(
  sessionId: string,
  teamSize: number,
  supabase: ServiceRoleClient
) {
  const [{ data: participants }, { data: existingTeams }] = await Promise.all([
    supabase
      .from("participants")
      .select("id, joined_at")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("teams")
      .select("id, name, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  const participantRows = participants ?? [];
  if (participantRows.length === 0) return;

  const requiredTeamCount = Math.max(1, Math.ceil(participantRows.length / teamSize));
  const teamRows = [...(existingTeams ?? [])];

  while (teamRows.length < requiredTeamCount) {
    const { data: newTeam, error } = await supabase
      .from("teams")
      .insert({
        session_id: sessionId,
        name: `Team ${teamRows.length + 1}`,
      })
      .select("id, name, created_at")
      .single();

    if (error || !newTeam) {
      throw new Error("Failed to create team");
    }

    teamRows.push(newTeam);
  }

  const assignments = participantRows.map((participant, index) => {
    const teamIndex = Math.floor(index / teamSize);
    const team = teamRows[teamIndex];
    return {
      participantId: participant.id,
      teamId: team.id,
      isVoter: index % teamSize === 0,
    };
  });

  for (const assignment of assignments) {
    await supabase
      .from("participants")
      .update({
        team_id: assignment.teamId,
        is_voter: assignment.isVoter,
      })
      .eq("id", assignment.participantId);
  }

  const unusedTeams = teamRows.slice(requiredTeamCount);
  if (unusedTeams.length > 0) {
    await supabase
      .from("teams")
      .delete()
      .in("id", unusedTeams.map((team) => team.id));
  }
}

export async function maybeRebalanceSessionTeams(
  sessionId: string,
  simulation: {
    mode: Database["public"]["Tables"]["simulations"]["Row"]["mode"];
    team_assignment: Database["public"]["Tables"]["simulations"]["Row"]["team_assignment"];
    team_size: Database["public"]["Tables"]["simulations"]["Row"]["team_size"];
  },
  supabase: ServiceRoleClient
) {
  if (simulation.mode !== "teams" || simulation.team_assignment === "self") return;
  await rebalanceAutoTeamsForSession(sessionId, Math.max(2, simulation.team_size ?? 4), supabase);
}
