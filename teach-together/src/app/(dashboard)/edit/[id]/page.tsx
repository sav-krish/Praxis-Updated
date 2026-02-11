import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SimulationEditor } from "./simulation-editor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSimulationPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch simulation with all related data
  const { data: simulation, error } = await supabase
    .from("simulations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !simulation) {
    notFound();
  }

  // Fetch decisions with options
  const { data: decisions } = await supabase
    .from("decisions")
    .select(`
      *,
      options (*)
    `)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch reflection questions
  const { data: reflectionQuestions } = await supabase
    .from("reflection_questions")
    .select("*")
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Sort options within each decision
  const sortedDecisions = decisions?.map(d => ({
    ...d,
    options: d.options.sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
  })) || [];

  return (
    <SimulationEditor
      simulation={simulation}
      decisions={sortedDecisions}
      reflectionQuestions={reflectionQuestions || []}
    />
  );
}
