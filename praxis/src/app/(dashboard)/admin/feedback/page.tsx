import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminFeedbackView } from "./admin-feedback-view";

interface AdminFeedbackPageProps {
  searchParams: Promise<{ type?: string; role?: string }>;
}

export default async function AdminFeedbackPage({ searchParams }: AdminFeedbackPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = await isAdmin(user ?? null);
  if (!admin) {
    redirect("/dashboard");
  }

  const { type, role } = await searchParams;

  const query = supabase
    .from("feedback")
    .select(`
      id,
      simulation_id,
      session_id,
      feedback_type,
      role,
      user_id,
      participant_id,
      checked_items,
      freeform_text,
      created_at,
      simulations(title)
    `)
    .order("created_at", { ascending: false });

  if (type && (type === "post_generation" || type === "post_session")) {
    query.eq("feedback_type", type);
  }
  if (role && (role === "professor" || role === "student")) {
    query.eq("role", role);
  }

  const { data: feedback } = await query;

  const userIds = [...new Set((feedback ?? []).map((f) => f.user_id).filter(Boolean))] as string[];
  const participantIds = [...new Set((feedback ?? []).map((f) => f.participant_id).filter(Boolean))] as string[];

  const { data: professors } = userIds.length > 0
    ? await supabase.from("professors").select("id, name").in("id", userIds)
    : { data: [] };
  const { data: participants } = participantIds.length > 0
    ? await supabase.from("participants").select("id, name").in("id", participantIds)
    : { data: [] };

  const professorNames = new Map((professors ?? []).map((p) => [p.id, p.name ?? "Unknown"]));
  const participantNames = new Map((participants ?? []).map((p) => [p.id, p.name ?? "Unknown"]));

  const feedbackWithMeta = (feedback ?? []).map((f) => {
    const sim = (f as { simulations?: { title?: string } | null }).simulations;
    const name = f.user_id
      ? professorNames.get(f.user_id) ?? "Unknown"
      : f.participant_id
        ? participantNames.get(f.participant_id) ?? "Unknown"
        : "Unknown";
    return {
      ...f,
      simulation_title: sim?.title ?? "Unknown",
      submitter_name: name,
    };
  });

  return (
    <AdminFeedbackView
      feedback={feedbackWithMeta}
      currentType={type ?? "all"}
      currentRole={role ?? "all"}
    />
  );
}
