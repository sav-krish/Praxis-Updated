import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SimulationDataBlock } from "@/types/data-blocks";
import { SimulationEditorDynamic } from "./simulation-editor-dynamic";
import {
  SIMULATION_EDITOR_ROW,
  REFLECTION_QUESTION_EDITOR_ROW,
  SIMULATION_DATA_BLOCK_EDITOR_ROW,
  SIMULATION_PROFILE_EDITOR_ROW,
  SIMULATION_SOURCE_EDITOR_ROW,
} from "@/lib/supabase-query-columns";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function EditSimulationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { generated } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch simulation with all related data
  const { data: simulation, error } = await supabase
    .from("simulations")
    .select(SIMULATION_EDITOR_ROW)
    .eq("id", id)
    .single();

  if (error || !simulation) {
    notFound();
  }

  const isOwner = !!user && simulation.professor_id === user.id;

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
    .select(REFLECTION_QUESTION_EDITOR_ROW)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch data blocks
  const { data: dataBlocks } = await supabase
    .from("simulation_data_blocks")
    .select(SIMULATION_DATA_BLOCK_EDITOR_ROW)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch hidden profiles
  const { data: profiles } = await supabase
    .from("simulation_profiles")
    .select(SIMULATION_PROFILE_EDITOR_ROW)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch sources
  const { data: sources } = await supabase
    .from("simulation_sources")
    .select(SIMULATION_SOURCE_EDITOR_ROW)
    .eq("simulation_id", id)
    .order("created_at", { ascending: true });

  // Sort options within each decision
  const sortedDecisions = decisions?.map(d => ({
    ...d,
    options: d.options.sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
  })) || [];

  return (
    <SimulationEditorDynamic
      simulation={simulation}
      decisions={sortedDecisions}
      reflectionQuestions={reflectionQuestions || []}
      dataBlocks={(dataBlocks || []).map((b) => ({ ...b, block_type: b.block_type as SimulationDataBlock["block_type"], data: b.data as unknown as SimulationDataBlock["data"] }))}
      profiles={profiles || []}
      sources={(sources || []).map((s) => ({
        ...s,
        source_type: s.source_type as "file" | "url" | "text" | "manual",
      }))}
      userId={user?.id}
      isNewlyGenerated={generated === "1"}
      isOwner={isOwner}
    />
  );
}
