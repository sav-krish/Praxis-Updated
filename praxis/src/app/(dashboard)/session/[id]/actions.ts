"use server";

import { createClient } from "@/lib/supabase/server";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createPreviewSession(
  simulationId: string
): Promise<
  | { joinCode: string; sessionId: string; participantId: string; participantName: string }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to preview." };
  }

  const { data: simulation } = await supabase
    .from("simulations")
    .select("id, title")
    .eq("id", simulationId)
    .eq("professor_id", user.id)
    .single();

  if (!simulation) {
    return { error: "Simulation not found or you do not own it." };
  }

  const professorName =
    (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Professor";
  const participantName = `Preview (${professorName})`;

  const joinCode = generateJoinCode();
  const now = new Date().toISOString();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      simulation_id: simulationId,
      join_code: joinCode,
      status: "running",
      current_step: 1,
      started_at: now,
      is_preview: true,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { error: sessionError?.message ?? "Failed to create preview session." };
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .insert({
      session_id: session.id,
      name: participantName,
      is_voter: true,
    })
    .select("id")
    .single();

  if (participantError || !participant) {
    return { error: participantError?.message ?? "Failed to create preview participant." };
  }

  return {
    joinCode,
    sessionId: session.id,
    participantId: participant.id,
    participantName,
  };
}

/** Mark a preview session complete so it does not clutter the DB (optional cleanup on exit). */
export async function endPreviewSession(sessionId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, simulation_id, is_preview")
    .eq("id", sessionId)
    .single();

  if (!session || !session.is_preview) {
    return { error: "Not a preview session." };
  }

  const { data: sim } = await supabase
    .from("simulations")
    .select("professor_id")
    .eq("id", session.simulation_id)
    .single();

  if (!sim || sim.professor_id !== user.id) {
    return { error: "You do not own this session." };
  }

  const { error } = await supabase
    .from("sessions")
    .update({ status: "complete", ended_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    return { error: error.message };
  }
  return { ok: true };
}

/** Create a professor participant for the running session so they can preview as student without joining. */
export async function createProfessorPreviewParticipant(
  sessionId: string
): Promise<
  | { participantId: string; participantName: string }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, simulation_id, status")
    .eq("id", sessionId)
    .single();

  if (!session || session.status !== "running") {
    return { error: "Session not found or not yet started." };
  }

  const { data: sim } = await supabase
    .from("simulations")
    .select("professor_id")
    .eq("id", session.simulation_id)
    .single();

  if (!sim || sim.professor_id !== user.id) {
    return { error: "You do not own this session." };
  }

  const professorName =
    (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Professor";
  const participantName = `Preview (${professorName})`;

  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      session_id: sessionId,
      name: participantName,
      is_voter: true,
    })
    .select("id")
    .single();

  if (error || !participant) {
    return { error: error?.message ?? "Failed to create preview participant." };
  }

  return {
    participantId: participant.id,
    participantName,
  };
}
