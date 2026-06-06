import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getSimulationSessionSchedule, setSimulationSessionSchedule } from "@/lib/session-schedule";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate a random 6-character join code
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

export default async function NewSessionPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify the simulation exists and belongs to the user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/auth/login"); }
  const { data: simulation } = await supabase
    .from("simulations")
    .select("id, preferences")
    .eq("id", id)
    .eq("professor_id", user.id)
    .single();

  if (!simulation) {
    redirect("/dashboard");
  }

  let { data: existingSession } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("simulation_id", id)
    .neq("status", "complete")
    .neq("is_preview", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const schedule = getSimulationSessionSchedule(simulation.preferences);
  const now = Date.now();
  const scheduledStart = schedule.start_at ? new Date(schedule.start_at).getTime() : null;
  const scheduledEnd = schedule.end_at ? new Date(schedule.end_at).getTime() : null;

  if (existingSession && scheduledEnd && now >= scheduledEnd) {
    await supabase
      .from("sessions")
      .update({ status: "complete", ended_at: new Date().toISOString() })
      .eq("id", existingSession.id);

    await supabase
      .from("simulations")
      .update({
        preferences: setSimulationSessionSchedule(simulation.preferences, {
          start_at: null,
          end_at: null,
        }),
      })
      .eq("id", id);

    existingSession = null;
  }

  if (existingSession) {
    if (existingSession.status === "lobby" && scheduledStart && now >= scheduledStart) {
      await supabase
        .from("sessions")
        .update({
          status: "running",
          current_step: 1,
          started_at: new Date().toISOString(),
        })
        .eq("id", existingSession.id)
        .eq("status", "lobby");
    }
    redirect(`/session/${id}/${existingSession.id}`);
  }

  // Create a new session
  const joinCode = generateJoinCode();
  let insertResult = await supabase
    .from("sessions")
    .insert({
      simulation_id: id,
      join_code: joinCode,
      response_gallery_access_code: generateGalleryAccessCode(),
      status: "lobby",
      current_step: 0,
    })
    .select()
    .single();

  if (isMissingResponseGalleryAccessCodeColumn(insertResult.error?.message)) {
    insertResult = await supabase
      .from("sessions")
      .insert({
        simulation_id: id,
        join_code: joinCode,
        status: "lobby",
        current_step: 0,
      })
      .select()
      .single();
  }

  const { data: session, error } = insertResult;

  if (error || !session) {
    logger.error(error);
    redirect("/dashboard");
  }

  // Redirect to the session lobby
  redirect(`/session/${id}/${session.id}`);
}
