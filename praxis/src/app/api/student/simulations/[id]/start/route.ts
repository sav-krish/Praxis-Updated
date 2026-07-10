import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  generateGalleryAccessCode,
  generateJoinCode,
  isMissingResponseGalleryAccessCodeColumn,
} from "@/lib/student/session-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id: simulationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    source?: "explore" | "classroom";
    assignmentId?: string;
  };

  const { data: professor } = await supabase
    .from("professors")
    .select("active_role, name")
    .eq("id", user.id)
    .single();

  if (professor?.active_role !== "student") {
    return NextResponse.json({ error: "Student account required." }, { status: 403 });
  }

  const { data: simulation } = await supabase
    .from("simulations")
    .select("id, title, is_public, mode")
    .eq("id", simulationId)
    .single();

  if (!simulation) {
    return NextResponse.json({ error: "Simulation not found." }, { status: 404 });
  }

  if (!simulation.is_public && !body.assignmentId) {
    return NextResponse.json({ error: "This simulation is not available to explore." }, { status: 403 });
  }

  const displayName =
    (user.user_metadata?.name as string) ||
    [user.user_metadata?.first_name, user.user_metadata?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.email?.split("@")[0] ||
    "Student";

  const joinCode = generateJoinCode();
  const now = new Date().toISOString();
  const adminSupabase = createServiceRoleClient();

  let sessionInsertResult = await adminSupabase
    .from("sessions")
    .insert({
      simulation_id: simulationId,
      join_code: joinCode,
      response_gallery_access_code: generateGalleryAccessCode(),
      status: "running",
      current_step: 1,
      started_at: now,
      is_preview: false,
    })
    .select("id")
    .single();

  if (isMissingResponseGalleryAccessCodeColumn(sessionInsertResult.error?.message)) {
    sessionInsertResult = await adminSupabase
      .from("sessions")
      .insert({
        simulation_id: simulationId,
        join_code: joinCode,
        status: "running",
        current_step: 1,
        started_at: now,
        is_preview: false,
      })
      .select("id")
      .single();
  }

  const { data: session, error: sessionError } = sessionInsertResult;
  if (sessionError || !session) {
    return NextResponse.json(
      { error: sessionError?.message ?? "Failed to create session." },
      { status: 500 }
    );
  }

  const { data: participant, error: participantError } = await adminSupabase
    .from("participants")
    .insert({
      session_id: session.id,
      name: displayName,
      is_voter: true,
      user_id: user.id,
    })
    .select("id, name")
    .single();

  if (participantError || !participant) {
    return NextResponse.json(
      { error: participantError?.message ?? "Failed to create participant." },
      { status: 500 }
    );
  }

  const source = body.source ?? (body.assignmentId ? "classroom" : "explore");

  const { data: attempt, error: attemptError } = await supabase
    .from("student_simulation_attempts")
    .insert({
      student_id: user.id,
      simulation_id: simulationId,
      session_id: session.id,
      participant_id: participant.id,
      assignment_id: body.assignmentId ?? null,
      source,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json(
      { error: attemptError?.message ?? "Failed to create attempt." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    attemptId: attempt.id,
    sessionId: session.id,
    joinCode,
    participantId: participant.id,
    participantName: participant.name,
  });
}
