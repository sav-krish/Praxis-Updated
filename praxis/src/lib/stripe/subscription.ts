import { createClient } from "@/lib/supabase/server";

/** Check if the current user has an active or trialing subscription. */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  return !!data;
}
