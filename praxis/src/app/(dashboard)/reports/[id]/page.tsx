import { notFound } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ReportsView } from "./reports-view";
import type { Database } from "@/types/database";
import {
  SIMULATION_REPORTS_HEADER,
  SESSION_REPORTS_LIST,
  SESSION_REPORTS_SELECTED,
  PARTICIPANT_REPORTS_ROW,
  TEAM_REPORTS_ROW,
  RESPONSE_REPORTS_ROW,
} from "@/lib/supabase-query-columns";
import type { ResponseGalleryItem } from "@/components/reports/response-gallery";

const SIMULATION_REPORTS_HEADER_LEGACY = "id, title, mode" as const;
const SESSION_REPORTS_SELECTED_LEGACY = "id, simulation_id, debrief_guide, status" as const;
const SESSION_REPORTS_SELECTED_FALLBACK = "id, simulation_id, debrief_guide, status, video_gallery_share_id, join_code" as const;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
}

type SessionReportsFallbackRow = {
  id: string;
  simulation_id: string;
  debrief_guide: Database["public"]["Tables"]["sessions"]["Row"]["debrief_guide"];
  status: "lobby" | "running" | "complete";
  video_gallery_share_id?: string | null;
  response_gallery_access_code?: string | null;
  join_code?: string | null;
};

export default async function ReportsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { session: sessionId } = await searchParams;
  const supabase = await createClient();

  // Fetch simulation
  let { data: simulation, error } = await supabase
    .from("simulations")
    .select(SIMULATION_REPORTS_HEADER)
    .eq("id", id)
    .single();

  if (error?.message?.includes("justification_type")) {
    const legacyResult = await supabase
      .from("simulations")
      .select(SIMULATION_REPORTS_HEADER_LEGACY)
      .eq("id", id)
      .single();
    simulation = legacyResult.data
      ? { ...legacyResult.data, justification_type: "written" as const }
      : null;
    error = legacyResult.error;
  }

  if (error || !simulation) {
    notFound();
  }

  // Fetch sessions for this simulation that can show results
  const { data: sessions } = await supabase
    .from("sessions")
    .select(SESSION_REPORTS_LIST)
    .eq("simulation_id", id)
    .in("status", ["running", "complete"])
    .neq("is_preview", true)
    .order("created_at", { ascending: false });

  // Get the selected session or the most recent one
  const selectedSessionId = sessionId || sessions?.[0]?.id;

  if (!selectedSessionId) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">No Session Results Yet</h1>
        <p className="text-muted-foreground">
          There are no running or completed sessions for this simulation yet.
        </p>
      </div>
    );
  }

  // Fetch session data
  let selectedSessionResult = await supabase
    .from("sessions")
    .select(SESSION_REPORTS_SELECTED)
    .eq("id", selectedSessionId)
    .single();

  if (selectedSessionResult.error?.message?.includes("response_gallery_access_code")) {
    selectedSessionResult = await supabase
      .from("sessions")
      .select(SESSION_REPORTS_SELECTED_FALLBACK)
      .eq("id", selectedSessionId)
      .single();
  }

  const selectedSessionRow = selectedSessionResult.data as SessionReportsFallbackRow | null;

  let selectedSession = selectedSessionRow
      ? {
          ...selectedSessionRow,
          join_code: selectedSessionRow.join_code ?? selectedSessionId.slice(0, 6).toUpperCase(),
          response_gallery_access_code:
            selectedSessionRow.response_gallery_access_code ??
            selectedSessionRow.join_code ??
            selectedSessionId.slice(0, 8).toUpperCase(),
          video_gallery_share_id:
            selectedSessionRow.video_gallery_share_id ?? selectedSessionId,
        }
    : null;

  if (!selectedSession) {
    const legacySessionResult = await supabase
      .from("sessions")
      .select(SESSION_REPORTS_SELECTED_LEGACY)
      .eq("id", selectedSessionId)
      .single();
    selectedSession = legacySessionResult.data
      ? {
          ...legacySessionResult.data,
          video_gallery_share_id: selectedSessionId,
          response_gallery_access_code: selectedSessionId.slice(0, 8).toUpperCase(),
          join_code: selectedSessionId.slice(0, 6).toUpperCase(),
        }
      : null;
  }

  if (!selectedSession) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
        <p className="text-muted-foreground">
          The selected session could not be loaded.
        </p>
      </div>
    );
  }

  // Fetch decisions with options
  const { data: decisions } = await supabase
    .from("decisions")
    .select(`
      *,
      options(*)
    `)
    .eq("simulation_id", id)
    .order("order_num", { ascending: true });

  // Fetch participants
  const { data: participants } = await supabase
    .from("participants")
    .select(PARTICIPANT_REPORTS_ROW)
    .eq("session_id", selectedSessionId);

  // Fetch teams
  const { data: teams } = await supabase
    .from("teams")
    .select(TEAM_REPORTS_ROW)
    .eq("session_id", selectedSessionId);

  // Fetch responses
  const { data: responses } = await supabase
    .from("responses")
    .select(RESPONSE_REPORTS_ROW)
    .eq("session_id", selectedSessionId);

  // Fetch reflection responses
  const { data: reflectionResponses } = await supabase
    .from("reflection_responses")
    .select(`
      *,
      question:reflection_questions(question)
    `)
    .eq("session_id", selectedSessionId);

  let responseGalleryItems: ResponseGalleryItem[] = [];
  if (simulation.justification_type === "video" || simulation.justification_type === "video_or_text" || simulation.justification_type === "written") {
    try {
      const svc = createServiceRoleClient();
      const { data: responseVideoRows } = await svc
        .from("response_videos")
        .select("id, response_id, decision_id, option_id, participant_id, storage_path, mime_type, duration_seconds, created_at")
        .eq("session_id", selectedSessionId);

      let videoRows: ResponseGalleryItem[] = [];
      if (responseVideoRows?.length) {
        const signedUrls = await Promise.all(
          responseVideoRows.map(async (row) => {
            const { data } = await svc.storage
              .from("response-videos")
              .createSignedUrl(row.storage_path, 60 * 60);
            return { id: row.id, url: data?.signedUrl ?? null };
          })
        );
        const signedUrlMap = new Map(signedUrls.map((row) => [row.id, row.url]));
        videoRows = responseVideoRows
          .map((row) => ({
            id: row.response_id,
            decision_id: row.decision_id,
            option_id: row.option_id,
            participant_id: row.participant_id,
            participant_name:
              participants?.find((p) => p.id === row.participant_id)?.name ?? "Student",
            response_type: "video" as const,
            justification: null,
            video_url: signedUrlMap.get(row.id) ?? "",
            mime_type: row.mime_type ?? null,
            duration_seconds: row.duration_seconds,
            created_at: row.created_at,
          }))
          .filter((row) => row.video_url);
      }

      const videoResponseIds = new Set(videoRows.map((row) => row.id));
      const textRows: ResponseGalleryItem[] = (responses ?? [])
        .filter((row) => !videoResponseIds.has(row.id) && row.justification)
        .map((row) => ({
          id: row.id,
          decision_id: row.decision_id,
          option_id: row.option_id,
          participant_id: row.participant_id,
          participant_name:
            participants?.find((p) => p.id === row.participant_id)?.name ?? "Student",
          response_type: "text",
          justification: row.justification,
          video_url: null,
          mime_type: null,
          duration_seconds: null,
          created_at: row.submitted_at,
        }));

      responseGalleryItems = [...videoRows, ...textRows];
    } catch {
      responseGalleryItems = (responses ?? [])
        .filter((row) => row.justification)
        .map((row) => ({
          id: row.id,
          decision_id: row.decision_id,
          option_id: row.option_id,
          participant_id: row.participant_id,
          participant_name:
            participants?.find((p) => p.id === row.participant_id)?.name ?? "Student",
          response_type: "text",
          justification: row.justification,
          video_url: null,
          mime_type: null,
          duration_seconds: null,
          created_at: row.submitted_at,
        }));
    }
  }

  return (
    <ReportsView
      simulation={simulation}
      sessions={sessions || []}
      selectedSession={selectedSession}
      decisions={decisions?.map(d => ({
        ...d,
        options: d.options.sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
      })) || []}
      participants={participants || []}
      teams={teams || []}
      responses={responses || []}
      responseGalleryItems={responseGalleryItems}
      reflectionResponses={reflectionResponses || []}
      initialDebrief={selectedSession?.debrief_guide as Record<string, unknown> | null}
    />
  );
}
