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

  const [{ data: profile }, { data: studentProfile }] = await Promise.all([
    supabase
      .from("professors")
      .select("active_role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("student_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (studentProfile || profile?.active_role === "student") redirect("/dashboard");

  return children;
}
