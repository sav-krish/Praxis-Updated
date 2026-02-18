import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ShareView } from "./share-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShareSimulationPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: simulation, error } = await supabase
    .from("simulations")
    .select("id, title, course_topic, professor_id")
    .eq("id", id)
    .single();

  if (error || !simulation) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const isOwner = simulation.professor_id === user.id;

  const shareUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/share/${simulation.id}`
      : "";

  return (
    <div className="max-w-lg mx-auto">
      <ShareView
        simulationId={simulation.id}
        title={simulation.title}
        courseTopic={simulation.course_topic}
        isOwner={isOwner}
        shareUrl={shareUrl}
      />
    </div>
  );
}
