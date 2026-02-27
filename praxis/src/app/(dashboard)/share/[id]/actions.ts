"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type SimInsert = Database["public"]["Tables"]["simulations"]["Insert"];
type DecInsert = Database["public"]["Tables"]["decisions"]["Insert"];
type OptInsert = Database["public"]["Tables"]["options"]["Insert"];
type RQInsert = Database["public"]["Tables"]["reflection_questions"]["Insert"];

export async function copySimulationToAccount(simulationId: string): Promise<{ newId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to copy a simulation." };
  }

  // Ensure professor row exists
  const { data: professor } = await supabase
    .from("professors")
    .select("id")
    .eq("id", user.id)
    .single();
  if (!professor) {
    await supabase.from("professors").insert({
      id: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string) ?? null,
    });
  }

  const { data: sim, error: simError } = await supabase
    .from("simulations")
    .select("*")
    .eq("id", simulationId)
    .single();

  if (simError || !sim) {
    return { error: "Simulation not found." };
  }

  const { data: decisions } = await supabase
    .from("decisions")
    .select("*, options(*)")
    .eq("simulation_id", simulationId)
    .order("order_num", { ascending: true });

  const { data: reflectionQuestions } = await supabase
    .from("reflection_questions")
    .select("*")
    .eq("simulation_id", simulationId)
    .order("order_num", { ascending: true });

  const {
    id: _id,
    professor_id: _pid,
    created_at: _ca,
    updated_at: _ua,
    ...simInsert
  } = sim as Record<string, unknown>;

  const { data: newSim, error: insertSimError } = await supabase
    .from("simulations")
    .insert({
      ...simInsert,
      professor_id: user.id,
      title: `${sim.title} (copy)`,
    } as SimInsert)
    .select("id")
    .single();

  if (insertSimError || !newSim) {
    return { error: insertSimError?.message ?? "Failed to create copy." };
  }

  const newSimId = newSim.id as string;
  const decisionIdMap: Record<string, string> = {};

  for (const d of decisions ?? []) {
    const { id: _did, simulation_id: _sid, created_at: _dca, options: opts, ...dRest } = d as Record<string, unknown> & { options?: Record<string, unknown>[] };
    const { data: newDec, error: decErr } = await supabase
      .from("decisions")
      .insert({
        ...dRest,
        simulation_id: newSimId,
      } as DecInsert)
      .select("id")
      .single();
    if (decErr || !newDec) continue;
    decisionIdMap[d.id as string] = newDec.id as string;

    for (const opt of opts ?? []) {
      const { id: _oid, decision_id: _did2, created_at: _oca, ...optRest } = opt as Record<string, unknown>;
      await supabase
        .from("options")
        .insert({
          ...optRest,
          decision_id: newDec.id,
        } as OptInsert);
    }
  }

  for (const rq of reflectionQuestions ?? []) {
    const { id: _rqid, simulation_id: _rqsid, created_at: _rqca, ...rqRest } = rq as Record<string, unknown>;
    await supabase
      .from("reflection_questions")
      .insert({
        ...rqRest,
        simulation_id: newSimId,
      } as RQInsert);
  }

  return { newId: newSimId };
}
