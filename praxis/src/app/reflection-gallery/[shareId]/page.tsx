import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ReflectionGallery, type ReflectionGalleryItem } from "@/components/reports/reflection-gallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

type GallerySessionRow = {
  id: string;
  status: string;
  simulation: {
    id: string;
    title: string;
  } | null;
};

export default async function ReflectionGalleryPage({ params }: PageProps) {
  const { shareId } = await params;
  const supabase = createServiceRoleClient();

  const { data: sessionRow } = await supabase
    .from("sessions")
    .select(`
      id,
      status,
      simulation:simulations(
        id,
        title
      )
    `)
    .eq("video_gallery_share_id", shareId)
    .single();

  const session = sessionRow as GallerySessionRow | null;

  if (!session || !session.simulation || !["running", "complete"].includes(session.status)) {
    notFound();
  }

  const [{ data: participants }, { data: teams }, { data: reflectionResponses }] = await Promise.all([
    supabase
      .from("participants")
      .select("id, name")
      .eq("session_id", session.id),
    supabase
      .from("teams")
      .select("id, name")
      .eq("session_id", session.id),
    supabase
      .from("reflection_responses")
      .select(`
        id,
        participant_id,
        team_id,
        response,
        question:reflection_questions(question)
      `)
      .eq("session_id", session.id),
  ]);

  const items: ReflectionGalleryItem[] = (reflectionResponses ?? []).map((item) => ({
    id: item.id,
    response: item.response,
    participant_name:
      teams?.find((team) => team.id === item.team_id)?.name ??
      participants?.find((participant) => participant.id === item.participant_id)?.name ??
      "Student",
    question: item.question.question,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reflection Gallery</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{session.simulation.title}</p>
            <p className="mt-1">
              Explore how students reflected on the simulation, grouped by question.
            </p>
          </CardContent>
        </Card>

        <ReflectionGallery items={items} />
      </div>
    </div>
  );
}
