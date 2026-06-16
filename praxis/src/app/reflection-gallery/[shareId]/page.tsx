import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ReflectionGallery, type ReflectionGalleryItem } from "@/components/reports/reflection-gallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockReflectionGallery } from "./actions";

interface PageProps {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ error?: string }>;
}

type GallerySessionRow = {
  id: string;
  status: string;
  join_code?: string | null;
  response_gallery_access_code?: string | null;
  simulation: {
    id: string;
    title: string;
  } | null;
};

function galleryCookieName(shareId: string) {
  return `praxis_reflection_gallery_${shareId}`;
}

export default async function ReflectionGalleryPage({ params, searchParams }: PageProps) {
  const { shareId } = await params;
  const { error } = await searchParams;
  const supabase = createServiceRoleClient();

  let sessionResult = await supabase
    .from("sessions")
    .select(`
      id,
      status,
      join_code,
      response_gallery_access_code,
      simulation:simulations(
        id,
        title
      )
    `)
    .eq("video_gallery_share_id", shareId)
    .single();

  if (sessionResult.error?.message?.includes("response_gallery_access_code")) {
    sessionResult = await supabase
      .from("sessions")
      .select(`
        id,
        status,
        join_code,
        simulation:simulations(
          id,
          title
        )
      `)
      .eq("video_gallery_share_id", shareId)
      .single();
  }

  const sessionRow = sessionResult.data as GallerySessionRow | null;
  const session = sessionRow
    ? {
        ...sessionRow,
        response_gallery_access_code:
          sessionRow.response_gallery_access_code ?? sessionRow.join_code,
      }
    : null;

  if (!session || !session.simulation || !["running", "complete"].includes(session.status)) {
    notFound();
  }

  const expectedCode = (session.response_gallery_access_code || session.join_code || "").toUpperCase();
  const cookieStore = await cookies();
  const hasAccess = cookieStore.get(galleryCookieName(shareId))?.value?.toUpperCase() === expectedCode;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-lg space-y-6 px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Reflection Gallery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{session.simulation.title}</p>
                <p className="mt-1">
                  Enter the gallery access code shared by your instructor to view student reflections.
                </p>
              </div>
              <form action={unlockReflectionGallery.bind(null, shareId)} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="accessCode">Gallery Access Code</Label>
                  <Input
                    id="accessCode"
                    name="accessCode"
                    placeholder="Enter code"
                    autoComplete="one-time-code"
                    className="font-mono uppercase tracking-[0.2em]"
                    required
                  />
                </div>
                {error === "invalid-code" ? (
                  <p className="text-sm text-destructive">That access code is incorrect.</p>
                ) : null}
                <Button type="submit" className="w-full min-h-[44px]">
                  View Reflection Gallery
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
