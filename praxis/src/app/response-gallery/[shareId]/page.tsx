import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ResponseGallery, type ResponseGalleryItem } from "@/components/reports/response-gallery";
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
    justification_type: "written" | "video" | "video_or_text";
  } | null;
};

export default async function ResponseGalleryPage({ params }: PageProps) {
  const { shareId } = await params;
  const supabase = createServiceRoleClient();

  const { data: sessionRow } = await supabase
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

  const session = sessionRow as GallerySessionRow | null;

  const simulation = session?.simulation as
    | { id: string; title: string; justification_type: "written" | "video" | "video_or_text" }
    | null;

  if (!session || !simulation || !["running", "complete"].includes(session.status)) {
    notFound();
  }

  const [{ data: decisions }, { data: participants }, { data: responses }, { data: responseVideoRows }] = await Promise.all([
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
      .from("responses")
      .select("id, decision_id, option_id, participant_id, justification, submitted_at")
      .eq("session_id", session.id),
    supabase
      .from("response_videos")
      .select("id, response_id, decision_id, option_id, participant_id, storage_path, mime_type, duration_seconds, created_at")
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
  const videoItems: ResponseGalleryItem[] = (responseVideoRows ?? [])
    .map((row) => ({
      id: row.response_id,
      decision_id: row.decision_id,
      option_id: row.option_id,
      participant_id: row.participant_id,
      participant_name: participants?.find((p) => p.id === row.participant_id)?.name ?? "Student",
      response_type: "video" as const,
      justification: null,
      video_url: signedUrlMap.get(row.id) ?? null,
      mime_type: row.mime_type ?? null,
      duration_seconds: row.duration_seconds,
      created_at: row.created_at,
    }))
    .filter((row) => row.video_url);

  const videoResponseIds = new Set(videoItems.map((row) => row.id));
  const textItems: ResponseGalleryItem[] = (responses ?? [])
    .filter((row) => !videoResponseIds.has(row.id) && row.justification)
    .map((row) => ({
      id: row.id,
      decision_id: row.decision_id,
      option_id: row.option_id,
      participant_id: row.participant_id,
      participant_name: participants?.find((p) => p.id === row.participant_id)?.name ?? "Student",
      response_type: "text",
      justification: row.justification,
      video_url: null,
      mime_type: null,
      duration_seconds: null,
      created_at: row.submitted_at,
    }));

  const items = [...videoItems, ...textItems];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Response Gallery</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{simulation.title}</p>
            <p className="mt-1">
              Explore how students justified their choices, grouped by decision and selected option.
            </p>
          </CardContent>
        </Card>

        <ResponseGallery
          decisions={(decisions ?? []).map((decision) => ({
            ...decision,
            options: [...decision.options].sort((a, b) => a.label.localeCompare(b.label)),
          }))}
          items={items}
          responses={responses ?? []}
        />
      </div>
    </div>
  );
}
