import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CreateSimulationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("professors")
    .select("active_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.active_role === "student") redirect("/dashboard");

  return children;
}
