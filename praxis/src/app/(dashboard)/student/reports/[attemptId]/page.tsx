import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildDecisionExplanations } from "@/lib/student/explanations";
import { scorePercent } from "@/lib/student/scoring";
import { StudentReportView } from "@/components/student/student-report-view";

interface StudentReportPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function StudentReportPage({ params }: StudentReportPageProps) {
  const { attemptId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  const { data: attempt } = await supabase
    .from("student_simulation_attempts")
    .select(
      `id, student_id, session_id, participant_id, status, score, completed_at,
       simulation:simulations(id, title)`
    )
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.student_id !== user.id) {
    notFound();
  }

  if (attempt.status !== "completed") {
    redirect("/dashboard");
  }

  const simulation = attempt.simulation as { id: string; title: string } | null;
  if (!simulation) {
    notFound();
  }

  const { data: decisions } = await supabase
    .from("decisions")
    .select(
      `id, order_num, prompt,
       options(id, label, title, description, consequence, score)`
    )
    .eq("simulation_id", simulation.id)
    .order("order_num", { ascending: true });

  const { data: participant } = attempt.participant_id
    ? await supabase
        .from("participants")
        .select("id, team_id")
        .eq("id", attempt.participant_id)
        .eq("session_id", attempt.session_id)
        .maybeSingle()
    : await supabase
        .from("participants")
        .select("id, team_id")
        .eq("session_id", attempt.session_id)
        .eq("user_id", user.id)
        .maybeSingle();

  let responses: { decision_id: string; option_id: string }[] = [];
  if (participant) {
    const { data: responseRows } = await supabase
      .from("responses")
      .select("decision_id, option_id")
      .eq("session_id", attempt.session_id)
      .eq("participant_id", participant.id);
    responses = responseRows ?? [];
  }

  // Fetch reflection responses
  let reflectionResponses: { question: string; response: string }[] = [];
  if (participant) {
    const { data: reflectionRows } = await supabase
      .from("reflection_responses")
      .select("question_id, response")
      .eq("session_id", attempt.session_id)
      .eq("participant_id", participant.id);

    if (reflectionRows && reflectionRows.length > 0) {
      const questionIds = reflectionRows.map((r) => r.question_id);
      const { data: questions } = await supabase
        .from("reflection_questions")
        .select("id, question")
        .in("id", questionIds)
        .order("order_num", { ascending: true });

      const questionMap = new Map((questions ?? []).map((q) => [q.id, q.question]));
      reflectionResponses = reflectionRows.map((r) => ({
        question: questionMap.get(r.question_id) ?? "Reflection question",
        response: r.response,
      }));
    }
  }

  // Fetch team score (average of all team members' scores)
  let teamScore: number | null = null;
  if (participant?.team_id) {
    const { data: teamParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("session_id", attempt.session_id)
      .eq("team_id", participant.team_id);

    if (teamParticipants && teamParticipants.length > 0) {
      const teamParticipantIds = teamParticipants.map((p) => p.id);
      const { data: teamAttempts } = await supabase
        .from("student_simulation_attempts")
        .select("score")
        .eq("session_id", attempt.session_id)
        .in("participant_id", teamParticipantIds)
        .not("score", "is", null);

      if (teamAttempts && teamAttempts.length > 0) {
        const total = teamAttempts.reduce((sum, a) => sum + (a.score ?? 0), 0);
        teamScore = Math.round(total / teamAttempts.length);
      }
    }
  }

  const decisionExplanations = buildDecisionExplanations(
    (decisions ?? []).map((d) => ({
      ...d,
      options: (d.options as {
        id: string;
        label: string;
        title: string;
        description: string | null;
        consequence: string | null;
        score: number;
      }[]) ?? [],
    })),
    responses
  );
  const recordedScore = decisionExplanations.reduce(
    (total, decision) => total + decision.score,
    0,
  );
  const availableMaxScore = (decisions ?? []).reduce((total, decision) => {
    const optionScores = (
      decision.options as Array<{ score: number }> | null
    )?.map((option) => option.score ?? 0) ?? [];
    return total + Math.max(0, ...optionScores);
  }, 0);
  const calculatedScore =
    responses.length > 0 && availableMaxScore > 0
      ? scorePercent(recordedScore, availableMaxScore)
      : attempt.score ?? 0;

  return (
    <StudentReportView
      simulationTitle={simulation.title}
      score={calculatedScore}
      teamScore={teamScore}
      completedAt={attempt.completed_at}
      decisions={decisionExplanations}
      reflectionResponses={reflectionResponses}
      attemptId={attempt.id}
      sessionId={attempt.session_id}
    />
  );
}
