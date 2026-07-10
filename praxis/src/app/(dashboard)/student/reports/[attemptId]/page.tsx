import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildDecisionExplanations } from "@/lib/student/explanations";
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
      `id, student_id, session_id, status, score, completed_at,
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

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
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

  return (
    <StudentReportView
      simulationTitle={simulation.title}
      score={attempt.score ?? 0}
      completedAt={attempt.completed_at}
      decisions={decisionExplanations}
      attemptId={attempt.id}
      sessionId={attempt.session_id}
    />
  );
}
