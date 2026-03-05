import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/** Returns true only for professors (not students) who are in ADMIN_EMAILS or have is_admin in DB. */
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;

  const supabase = await createClient();
  const { data: professor } = await supabase
    .from("professors")
    .select("active_role, is_admin")
    .eq("id", user.id)
    .single();

  if (professor?.active_role === "student") return false;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.includes(user.email?.toLowerCase() ?? "")) return true;

  return professor?.is_admin === true;
}
