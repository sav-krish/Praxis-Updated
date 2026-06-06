"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { publicScenarioImageUrl, SCENARIO_IMAGES_BUCKET } from "@/lib/scenario-image-url";

type SimInsert = Database["public"]["Tables"]["simulations"]["Insert"];
type DecInsert = Database["public"]["Tables"]["decisions"]["Insert"];
type OptInsert = Database["public"]["Tables"]["options"]["Insert"];
type RQInsert = Database["public"]["Tables"]["reflection_questions"]["Insert"];
type DataBlockInsert = Database["public"]["Tables"]["simulation_data_blocks"]["Insert"];
type ProfileInsert = Database["public"]["Tables"]["simulation_profiles"]["Insert"];
type ScenarioImageInsert = Database["public"]["Tables"]["simulation_scenario_images"]["Insert"];

/** Returns a shallow copy of `row` without the listed keys — used when cloning rows for insert. */
function omitKeys(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out = { ...row };
  for (const k of keys) {
    delete out[k];
  }
  return out;
}

export async function copySimulationToAccount(simulationId: string): Promise<{ newId: string } | { error: string }> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
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

  const { data: sim, error: simError } = await serviceSupabase
    .from("simulations")
    .select("*")
    .eq("id", simulationId)
    .single();

  if (simError || !sim) {
    return { error: "Simulation not found." };
  }

  const { data: decisions } = await serviceSupabase
    .from("decisions")
    .select("*, options(*)")
    .eq("simulation_id", simulationId)
    .order("order_num", { ascending: true });

  const { data: reflectionQuestions } = await serviceSupabase
    .from("reflection_questions")
    .select("*")
    .eq("simulation_id", simulationId)
    .order("order_num", { ascending: true });

  const { data: dataBlocks } = await serviceSupabase
    .from("simulation_data_blocks")
    .select("*")
    .eq("simulation_id", simulationId)
    .order("order_num", { ascending: true });

  const { data: profiles } = await serviceSupabase
    .from("simulation_profiles")
    .select("*")
    .eq("simulation_id", simulationId)
    .order("order_num", { ascending: true });

  const { data: scenarioImages } = await serviceSupabase
    .from("simulation_scenario_images")
    .select("id, storage_path, alt_text, order_num")
    .eq("simulation_id", simulationId)
    .order("order_num", { ascending: true });

  const simInsert = omitKeys(sim as Record<string, unknown>, [
    "id",
    "professor_id",
    "created_at",
    "updated_at",
  ]);

  const { data: newSim, error: insertSimError } = await supabase
    .from("simulations")
    .insert({
      ...simInsert,
      professor_id: user.id,
      title: `${sim.title} (copy)`,
      mode: "individual",
      team_size: null,
      team_assignment: null,
      justification_type: "written",
      hidden_profiles_enabled: false,
      preferences: {},
      is_public: false,
      is_pinned: false,
      pinned_order: null,
      favorite_count: 0,
    } as SimInsert)
    .select("id")
    .single();

  if (insertSimError || !newSim) {
    return { error: insertSimError?.message ?? "Failed to create copy." };
  }

  const newSimId = newSim.id as string;
  const decisionIdMap: Record<string, string> = {};

  for (const d of decisions ?? []) {
    const row = d as Record<string, unknown> & { options?: Record<string, unknown>[] };
    const opts = row.options;
    const dRest = omitKeys(row, ["id", "simulation_id", "created_at", "options"]);
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
      const optRest = omitKeys(opt as Record<string, unknown>, ["id", "decision_id", "created_at"]);
      await supabase
        .from("options")
        .insert({
          ...optRest,
          decision_id: newDec.id,
        } as OptInsert);
    }
  }

  for (const rq of reflectionQuestions ?? []) {
    const rqRest = omitKeys(rq as Record<string, unknown>, ["id", "simulation_id", "created_at"]);
    await supabase
      .from("reflection_questions")
      .insert({
        ...rqRest,
        simulation_id: newSimId,
      } as RQInsert);
  }

  for (const block of dataBlocks ?? []) {
    const blockRest = omitKeys(block as Record<string, unknown>, ["id", "simulation_id", "created_at"]);
    await supabase
      .from("simulation_data_blocks")
      .insert({
        ...blockRest,
        simulation_id: newSimId,
      } as DataBlockInsert);
  }

  for (const profile of profiles ?? []) {
    const profileRest = omitKeys(profile as Record<string, unknown>, ["id", "simulation_id", "created_at"]);
    await supabase
      .from("simulation_profiles")
      .insert({
        ...profileRest,
        simulation_id: newSimId,
      } as ProfileInsert);
  }

  for (const img of scenarioImages ?? []) {
    const path = img.storage_path as string;
    if (!path) continue;
    const srcUrl = publicScenarioImageUrl(path);
    if (!srcUrl) continue;
    try {
      const res = await fetch(srcUrl);
      if (!res.ok) continue;
      const blob = await res.blob();
      const leaf = path.split("/").pop() || "image";
      const safeLeaf = leaf.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "image";
      const newPath = `${newSimId}/${crypto.randomUUID()}-${safeLeaf}`;
      const { error: upErr } = await supabase.storage
        .from(SCENARIO_IMAGES_BUCKET)
        .upload(newPath, blob, {
          contentType: blob.type || undefined,
          upsert: false,
        });
      if (upErr) continue;
      await supabase.from("simulation_scenario_images").insert({
        simulation_id: newSimId,
        storage_path: newPath,
        alt_text: img.alt_text,
        order_num: img.order_num,
      } as ScenarioImageInsert);
    } catch {
      /* skip broken image */
    }
  }

  return { newId: newSimId };
}
