import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { rebalanceAutoTeamsForSession } from "@/lib/team-assignment";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { code } = await params;
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();

  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, simulation_id, status, is_preview, simulation:simulations(mode, team_assignment, team_size)")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!session || session.status === "complete") {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const simulation = session?.simulation as
    | { mode: "individual" | "teams"; team_assignment: "auto" | "self" | null; team_size: number | null }
    | null;

  let participantRecord: {
    id: string;
    name: string;
    team_id: string | null;
    is_voter: boolean;
  } | null = null;
  let createdParticipant = false;

  if (user) {
    const { data: existingParticipant } = await supabase
      .from("participants")
      .select("id, name, team_id, is_voter")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    participantRecord = existingParticipant;
  }

  if (!participantRecord) {
    const { data: participant, error } = await supabase
      .from("participants")
      .insert({
        session_id: session.id,
        name,
        is_voter: true,
        user_id: user?.id ?? null,
      })
      .select("id, name, team_id, is_voter")
      .single();

    if (error || !participant) {
      return NextResponse.json({ error: "Failed to join session" }, { status: 500 });
    }

    participantRecord = participant;
    createdParticipant = true;
  }

  if (createdParticipant && simulation?.mode === "teams") {
    try {
      await rebalanceAutoTeamsForSession(session.id, Math.max(2, simulation.team_size ?? 4), supabase);
      const { data: refreshedParticipant } = await supabase
        .from("participants")
        .select("id, name, team_id, is_voter")
        .eq("id", participantRecord.id)
        .single();
      if (refreshedParticipant) {
        participantRecord = refreshedParticipant;
      }
    } catch {
      return NextResponse.json({ error: "Failed to assign team" }, { status: 500 });
    }
  }

  const { data: profiles } = await supabase
    .from("simulation_profiles")
    .select("id")
    .eq("simulation_id", session.simulation_id)
    .order("order_num", { ascending: true });

  if (createdParticipant && profiles && profiles.length > 0) {
    const { data: sessionParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("session_id", session.id)
      .order("joined_at", { ascending: true });

    const joinedIndex = sessionParticipants?.findIndex((p) => p.id === participantRecord.id) ?? -1;
    if (joinedIndex >= 0) {
      const profileId = profiles[joinedIndex % profiles.length]?.id;
      if (profileId) {
        await supabase
          .from("participants")
          .update({ profile_id: profileId })
          .eq("id", participantRecord.id);
      }
    }
  }

  let attemptId: string | null = null;
  if (user && !session.is_preview) {
    const { data: studentProfile } = await authSupabase
      .from("student_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (studentProfile) {
      const { data: existingAttempt } = await authSupabase
        .from("student_simulation_attempts")
        .select("id")
        .eq("student_id", user.id)
        .eq("session_id", session.id)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAttempt) {
        attemptId = existingAttempt.id;
      } else {
        const { data: attempt, error: attemptError } = await authSupabase
          .from("student_simulation_attempts")
          .insert({
            student_id: user.id,
            simulation_id: session.simulation_id,
            session_id: session.id,
            participant_id: participantRecord.id,
            source: "classroom",
            status: "in_progress",
          })
          .select("id")
          .single();

        if (attemptError || !attempt) {
          return NextResponse.json(
            { error: attemptError?.message ?? "Could not start your classroom attempt" },
            { status: 500 },
          );
        }
        attemptId = attempt.id;
      }
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    simulationId: session.simulation_id,
    participantId: participantRecord.id,
    participantName: participantRecord.name,
    participantUserId: user?.id ?? null,
    attemptId,
    teamId: participantRecord.team_id,
    isVoter: participantRecord.is_voter,
  });
}
