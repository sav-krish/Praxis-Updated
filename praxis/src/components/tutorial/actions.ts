"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Marks the current professor's tutorial as completed (or explicitly skipped).
 * Idempotent — calling it again just refreshes the timestamp.
 */
export async function markTutorialCompleted(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("professors")
    .update({ tutorial_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  return { ok: true };
}

/**
 * Resets the tutorial flag so the overlay re-mounts on next /dashboard load.
 * Triggered from the avatar dropdown's "Replay tutorial" item.
 */
export async function resetTutorial(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("professors")
    .update({ tutorial_completed_at: null })
    .eq("id", user.id);

  return { ok: true };
}
