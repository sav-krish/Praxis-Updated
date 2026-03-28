"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteSimulation(
  simulationId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data, error } = await supabase
    .from("simulations")
    .delete()
    .eq("id", simulationId)
    .eq("professor_id", user.id)
    .select("id");

  if (error) {
    return { error: error.message };
  }
  if (!data?.length) {
    return { error: "Simulation not found or you can't delete it." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
