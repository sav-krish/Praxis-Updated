import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionLobby } from "./session-lobby";

interface PageProps {
  params: Promise<{ id: string; sessionId: string }>;
}

export default async function SessionPage({ params }: PageProps) {
  const { id, sessionId } = await params;
  const supabase = await createClient();

  // Fetch session with simulation
  const { data: session, error } = await supabase
    .from("sessions")
    .select(`
      *,
      simulation:simulations(*)
    `)
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    notFound();
  }

  // Fetch participants
  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });

  // Fetch teams if team mode
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("session_id", sessionId);

  // Fetch decisions for progress tracking
  const { data: decisions } = await supabase
    .from("decisions")
    .select("id")
    .eq("simulation_id", id);

  // Fetch responses count
  const { data: responses } = await supabase
    .from("responses")
    .select("decision_id, participant_id, team_id")
    .eq("session_id", sessionId);

  // Fetch hidden profiles
  const { data: profiles } = await supabase
    .from("simulation_profiles")
    .select("*")
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  return (
    <SessionLobby
      session={session}
      simulation={session.simulation}
      participants={participants || []}
      teams={teams || []}
      decisions={decisions || []}
      responses={responses || []}
      profiles={profiles || []}
    />
  );
}
