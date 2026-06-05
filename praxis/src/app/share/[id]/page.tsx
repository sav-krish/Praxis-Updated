import { notFound } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ShareView } from "./share-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShareSimulationPage({ params }: PageProps) {
  const { id } = await params;
  const serviceSupabase = createServiceRoleClient();

  const { data: simulation, error } = await serviceSupabase
    .from("simulations")
    .select("id, title, course_topic, professor_id")
    .eq("id", id)
    .single();

  if (error || !simulation) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = Boolean(user);
  const isOwner = simulation.professor_id === user?.id;
  const shareUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/share/${simulation.id}`
      : "";

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <ShareView
        simulationId={simulation.id}
        title={simulation.title}
        courseTopic={simulation.course_topic}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
        shareUrl={shareUrl}
      />
    </div>
  );
}
