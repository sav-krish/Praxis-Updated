import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { VideoJustificationGallery, type VideoGalleryItem } from "@/components/reports/video-justification-gallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default async function VideoGalleryPage({ params }: PageProps) {
  const { shareId } = await params;
  const supabase = createServiceRoleClient();

  const { data: session } = await supabase
    .from("sessions")
    .select(`
      id,
      status,
      simulation:simulations(
        id,
        title,
        justification_type
      )
    `)
    .eq("video_gallery_share_id", shareId)
    .single();

  const simulation = session?.simulation as
    | { id: string; title: string; justification_type: "written" | "video" }
    | null;

  if (!session || !simulation || simulation.justification_type !== "video" || session.status !== "complete") {
    notFound();
  }

  const [{ data: decisions }, { data: participants }, { data: responseVideoRows }] = await Promise.all([
    supabase
      .from("decisions")
      .select("id, order_num, prompt, options(id, label, title)")
      .eq("simulation_id", simulation.id)
      .order("order_num", { ascending: true }),
    supabase
      .from("participants")
      .select("id, name")
      .eq("session_id", session.id),
    supabase
      .from("response_videos")
      .select("id, decision_id, option_id, participant_id, storage_path, mime_type, duration_seconds, created_at")
      .eq("session_id", session.id),
  ]);

  const signedUrls = await Promise.all(
    (responseVideoRows ?? []).map(async (row) => {
      const { data } = await supabase.storage
        .from("response-videos")
        .createSignedUrl(row.storage_path, 60 * 60);
      return { id: row.id, url: data?.signedUrl ?? null };
    })
  );

  const signedUrlMap = new Map(signedUrls.map((row) => [row.id, row.url]));
  const videos: VideoGalleryItem[] = (responseVideoRows ?? [])
    .map((row) => ({
      id: row.id,
      decision_id: row.decision_id,
      option_id: row.option_id,
      participant_id: row.participant_id,
      participant_name: participants?.find((p) => p.id === row.participant_id)?.name ?? "Student",
      video_url: signedUrlMap.get(row.id) ?? "",
      mime_type: row.mime_type,
      duration_seconds: row.duration_seconds,
      created_at: row.created_at,
    }))
    .filter((row) => row.video_url);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Video Justification Gallery</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{simulation.title}</p>
            <p className="mt-1">
              Explore how students justified their choices, grouped by decision and selected option.
            </p>
          </CardContent>
        </Card>

        <VideoJustificationGallery
          decisions={(decisions ?? []).map((decision) => ({
            ...decision,
            options: [...decision.options].sort((a, b) => a.label.localeCompare(b.label)),
          }))}
          videos={videos}
        />
      </div>
    </div>
  );
}
