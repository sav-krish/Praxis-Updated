"use server";

import { createClient } from "@/lib/supabase/server";
import { setSimulationSessionSchedule } from "@/lib/session-schedule";
import { setLiveConsequenceSnapshot } from "@/lib/simulation-flow";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateGalleryAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isMissingResponseGalleryAccessCodeColumn(message?: string | null): boolean {
  return !!message?.includes("response_gallery_access_code");
}

export async function createPreviewSession(
  simulationId: string
): Promise<
  | {
      joinCode: string;
      sessionId: string;
      participantId: string;
      participantName: string;
      participantUserId: string;
    }
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

  let sessionInsertResult = await supabase
    .from("sessions")
    .insert({
      simulation_id: simulationId,
      join_code: joinCode,
      response_gallery_access_code: generateGalleryAccessCode(),
      status: "running",
      current_step: 1,
      started_at: now,
      is_preview: true,
    })
    .select("id")
    .single();

  if (isMissingResponseGalleryAccessCodeColumn(sessionInsertResult.error?.message)) {
    sessionInsertResult = await supabase
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
  }

  const { data: session, error: sessionError } = sessionInsertResult;

  if (sessionError || !session) {
    return { error: sessionError?.message ?? "Failed to create preview session." };
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .insert({
      session_id: session.id,
      name: participantName,
      is_voter: true,
      user_id: user.id,
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
    participantUserId: user.id,
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
      user_id: user.id,
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

export async function clearSimulationScheduleForSession(
  sessionId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, simulation_id")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return { error: "Session not found." };
  }

  const { data: simulation } = await supabase
    .from("simulations")
    .select("id, professor_id, preferences")
    .eq("id", session.simulation_id)
    .single();

  if (!simulation || simulation.professor_id !== user.id) {
    return { error: "You do not own this simulation." };
  }

  const clearedPreferences = setSimulationSessionSchedule(simulation.preferences, {
    start_at: null,
    end_at: null,
  });

  const { error } = await supabase
    .from("simulations")
    .update({ preferences: clearedPreferences })
    .eq("id", simulation.id);

  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}

export async function pushConsequenceUpdatesToLiveSession(
  sessionId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, simulation_id, status")
    .eq("id", sessionId)
    .single();
  if (!session || session.status === "complete") {
    return { error: "The live session is no longer active." };
  }

  const { data: simulation } = await supabase
    .from("simulations")
    .select("id, professor_id, preferences")
    .eq("id", session.simulation_id)
    .single();
  if (!simulation || simulation.professor_id !== user.id) {
    return { error: "You do not own this simulation." };
  }

  const { data: decisions, error: decisionsError } = await supabase
    .from("decisions")
    .select("options(id, consequence)")
    .eq("simulation_id", simulation.id);
  if (decisionsError) return { error: decisionsError.message };

  const snapshot = Object.fromEntries(
    (decisions ?? []).flatMap((decision) =>
      decision.options.map((option) => [option.id, option.consequence] as const),
    ),
  );
  const preferences = setLiveConsequenceSnapshot(
    simulation.preferences,
    session.id,
    snapshot,
  );
  const { error } = await supabase
    .from("simulations")
    .update({ preferences })
    .eq("id", simulation.id);

  return error ? { error: error.message } : { ok: true };
}
