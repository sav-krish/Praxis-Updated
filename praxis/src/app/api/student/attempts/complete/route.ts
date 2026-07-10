import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { scorePercent } from "@/lib/student/scoring";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    attemptId?: string;
    totalScore?: number;
    maxScore?: number;
  } | null;

  if (!body?.attemptId) {
    return NextResponse.json({ error: "attemptId is required." }, { status: 400 });
  }

  const totalScore = body.totalScore ?? 0;
  const maxScore = body.maxScore ?? 0;
  const percentScore = scorePercent(totalScore, maxScore);

  const { data: attempt } = await supabase
    .from("student_simulation_attempts")
    .select("id, student_id, session_id, status")
    .eq("id", body.attemptId)
    .single();

  if (!attempt || attempt.student_id !== user.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  if (attempt.status === "completed") {
    return NextResponse.json({ attemptId: attempt.id, score: percentScore });
  }

  const now = new Date().toISOString();
  const adminSupabase = createServiceRoleClient();

  const { error: attemptError } = await supabase
    .from("student_simulation_attempts")
    .update({
      status: "completed",
      score: percentScore,
      completed_at: now,
    })
    .eq("id", attempt.id);

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  await adminSupabase
    .from("sessions")
    .update({ status: "complete", ended_at: now, current_step: 6 })
    .eq("id", attempt.session_id);

  return NextResponse.json({ attemptId: attempt.id, score: percentScore });
}
