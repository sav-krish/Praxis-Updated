import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportsView } from "./reports-view";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
}

export default async function ReportsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { session: sessionId } = await searchParams;
  const supabase = await createClient();

  // Fetch simulation
  const { data: simulation, error } = await supabase
    .from("simulations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !simulation) {
    notFound();
  }

  // Fetch all completed sessions for this simulation
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("simulation_id", id)
    .eq("status", "complete")
    .order("ended_at", { ascending: false });

  // Get the selected session or the most recent one
  const selectedSessionId = sessionId || sessions?.[0]?.id;

  if (!selectedSessionId) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">No Completed Sessions</h1>
        <p className="text-muted-foreground">
          There are no completed sessions for this simulation yet.
        </p>
      </div>
    );
  }

  // Fetch session data
  const { data: selectedSession } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", selectedSessionId)
    .single();

  // Fetch decisions with options
  const { data: decisions } = await supabase
    .from("decisions")
    .select(`
      *,
      options(*)
    `)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch participants
  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", selectedSessionId);

  // Fetch teams
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("session_id", selectedSessionId);

  // Fetch responses
  const { data: responses } = await supabase
    .from("responses")
    .select("*")
    .eq("session_id", selectedSessionId);

  // Fetch reflection responses
  const { data: reflectionResponses } = await supabase
    .from("reflection_responses")
    .select(`
      *,
      question:reflection_questions(question)
    `)
    .eq("session_id", selectedSessionId);

  return (
    <ReportsView
      simulation={simulation}
      sessions={sessions || []}
      selectedSession={selectedSession}
      decisions={decisions?.map(d => ({
        ...d,
        options: d.options.sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
      })) || []}
      participants={participants || []}
      teams={teams || []}
      responses={responses || []}
      reflectionResponses={reflectionResponses || []}
    />
  );
}
