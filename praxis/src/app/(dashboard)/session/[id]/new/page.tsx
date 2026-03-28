import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Generate a random 6-character join code
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function NewSessionPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify the simulation exists and belongs to the user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login"); }
  const { data: simulation } = await supabase
    .from("simulations")
    .select("id")
    .eq("id", id)
    .eq("professor_id", user.id)
    .single();

  if (!simulation) {
    redirect("/dashboard");
  }

  // Create a new session
  const joinCode = generateJoinCode();
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      simulation_id: id,
      join_code: joinCode,
      status: "lobby",
      current_step: 0,
    })
    .select()
    .single();

  if (error || !session) {
    console.error(error);
    redirect("/dashboard");
  }

  // Redirect to the session lobby
  redirect(`/session/${id}/${session.id}`);
}
