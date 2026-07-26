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

  const { data: attempt } = await supabase
    .from("student_simulation_attempts")
    .select("id, student_id, simulation_id, session_id, participant_id, status")
    .eq("id", body.attemptId)
    .single();

  if (!attempt || attempt.student_id !== user.id) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  const [{ data: decisions }, { data: responses }] = await Promise.all([
    supabase
      .from("decisions")
      .select("id, options(id, score)")
      .eq("simulation_id", attempt.simulation_id),
    attempt.participant_id
      ? supabase
          .from("responses")
          .select("decision_id, option_id")
          .eq("session_id", attempt.session_id)
          .eq("participant_id", attempt.participant_id)
      : Promise.resolve({ data: [] }),
  ]);
  const optionScores = new Map<string, number>();
  let maxScore = 0;
  for (const decision of decisions ?? []) {
    const scores = (decision.options ?? []).map((option) => {
      const score = option.score ?? 0;
      optionScores.set(option.id, score);
      return score;
    });
    maxScore += Math.max(0, ...scores);
  }
  const totalScore = (responses ?? []).reduce(
    (total, response) => total + (optionScores.get(response.option_id) ?? 0),
    0,
  );
  const percentScore = scorePercent(totalScore, maxScore);

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
