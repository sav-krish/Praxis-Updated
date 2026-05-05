"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function deleteLibrarySimulationAsAdmin(
  simulationId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  if (!(await isAdmin(user))) {
    return { error: "Admin access required." };
  }

  let adminSupabase;
  try {
    adminSupabase = createServiceRoleClient();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Service role client is not configured.";
    return { error: message };
  }

  const { data, error } = await adminSupabase
    .from("simulations")
    .delete()
    .eq("id", simulationId)
    .eq("is_public", true)
    .select("id");

  if (error) {
    return { error: error.message };
  }

  if (!data?.length) {
    return { error: "Public simulation not found or already deleted." };
  }

  revalidatePath("/library");
  revalidatePath("/dashboard");
  return { ok: true };
}
