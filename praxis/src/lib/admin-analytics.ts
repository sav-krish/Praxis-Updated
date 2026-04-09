import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AdminAnalyticsPayload = {
  summary: {
    professorCount: number;
    studentRoleCount: number;
    simulationCount: number;
    publicSimulationCount: number;
    pinnedSimulationCount: number;
    totalFavoritesOnPublic: number;
    subscriptionActiveCount: number;
    sessionsLast30NonPreview: number;
    participantsLast30: number;
    responsesLast30: number;
  };
  simulationsPerProfessor: { name: string; count: number }[];
  sessionsPerDay: { date: string; count: number }[];
  participantsPerDay: { date: string; count: number }[];
  responsesPerDay: { date: string; count: number }[];
  topSimulationsBySessions: { title: string; sessions: number }[];
};

/** Full chart dataset for the admin analytics UI (trend windows + complete bar rankings). */
export type AdminAnalyticsViewData = AdminAnalyticsPayload & {
  simulationsPerProfessorAll: { name: string; count: number }[];
  topSimulationsBySessionsAll: { title: string; sessions: number }[];
  sessionsPerDay365: { date: string; count: number }[];
  participantsPerDay365: { date: string; count: number }[];
  responsesPerDay365: { date: string; count: number }[];
};

function bucketTimestamps(dates: (string | null | undefined)[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const raw of dates) {
    if (!raw) continue;
    const day = raw.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return map;
}

/** Hide obvious sandbox rows from “most-run” chart */
function isJunkAnalyticsTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (t.length <= 1) return true;
  if (/^(test|testing|tests|debug|asdf|foo|bar|sample|demo|lorem)\d*$/i.test(t)) return true;
  if (/^test(\s|ing|$)/i.test(t) && t.length < 28) return true;
  if (/\bdebug\b/i.test(t) && t.length < 24) return true;
  return false;
}

function normalizeSimTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function fillLastNDays(
  n: number,
  series: { date: string; count: number }[]
): { date: string; count: number }[] {
  const byDay = new Map(series.map((s) => [s.date, s.count]));
  const out: { date: string; count: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

function parseSessionCount(raw: number | string): number {
  if (typeof raw === "number") return raw;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

export async function buildAdminAnalyticsViewData(
  svc: SupabaseClient<Database>
): Promise<AdminAnalyticsViewData> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since30 = thirtyDaysAgo.toISOString();

  const threeSixtyFiveDaysAgo = new Date();
  threeSixtyFiveDaysAgo.setDate(threeSixtyFiveDaysAgo.getDate() - 365);
  const since365 = threeSixtyFiveDaysAgo.toISOString();

  const [
    professorsRes,
    simulationsRes,
    sessionsRes,
    participantsRes,
    responsesRes,
    subscriptionsRes,
    sessionAggRes,
  ] = await Promise.all([
    svc.from("professors").select("id, name, email, active_role, created_at"),
    svc.from("simulations").select("id, professor_id, title, created_at, is_public, is_pinned, favorite_count"),
    svc.from("sessions").select("id, simulation_id, created_at, is_preview").gte("created_at", since365),
    svc.from("participants").select("id, joined_at").gte("joined_at", since365),
    svc.from("responses").select("id, submitted_at").gte("submitted_at", since365),
    svc.from("subscriptions").select("id, status"),
    svc.rpc("admin_session_counts_by_simulation"),
  ]);

  if (sessionAggRes.error) {
    throw new Error(
      `admin_session_counts_by_simulation: ${sessionAggRes.error.message}. Apply migration 20260409_admin_session_counts_rpc.sql.`
    );
  }

  const professors = professorsRes.data ?? [];
  const simulations = simulationsRes.data ?? [];
  const sessions365 = sessionsRes.data ?? [];
  const participants365 = participantsRes.data ?? [];
  const responses365 = responsesRes.data ?? [];
  const subscriptions = subscriptionsRes.data ?? [];
  const sessionAgg = sessionAggRes.data ?? [];

  const professorCount = professors.filter((p) => p.active_role === "professor").length;
  const studentRoleCount = professors.filter((p) => p.active_role === "student").length;

  const sessionsNonPreview365 = sessions365.filter((s) => !s.is_preview);
  const sessionsPerDayRaw365 = bucketTimestamps(sessionsNonPreview365.map((s) => s.created_at));
  const sessionsPerDay365 = fillLastNDays(
    365,
    [...sessionsPerDayRaw365.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))
  );
  const sessionsPerDay = sessionsPerDay365.slice(-30);

  const participantsPerDayRaw365 = bucketTimestamps(participants365.map((p) => p.joined_at));
  const participantsPerDay365 = fillLastNDays(
    365,
    [...participantsPerDayRaw365.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))
  );
  const participantsPerDay = participantsPerDay365.slice(-30);

  const responsesPerDayRaw365 = bucketTimestamps(responses365.map((r) => r.submitted_at));
  const responsesPerDay365 = fillLastNDays(
    365,
    [...responsesPerDayRaw365.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }))
  );
  const responsesPerDay = responsesPerDay365.slice(-30);

  const sessionsLast30NonPreview = sessions365.filter(
    (s) => !s.is_preview && s.created_at >= since30
  ).length;
  const participantsLast30 = participants365.filter((p) => p.joined_at >= since30).length;
  const responsesLast30 = responses365.filter((r) => r.submitted_at >= since30).length;

  const simsByProfessor = new Map<string, number>();
  for (const s of simulations) {
    simsByProfessor.set(s.professor_id, (simsByProfessor.get(s.professor_id) ?? 0) + 1);
  }

  const allProfEntries = [...simsByProfessor.entries()].sort((a, b) => b[1] - a[1]);
  const profName = new Map(professors.map((p) => [p.id, (p.name || p.email || p.id).slice(0, 40)]));
  const simulationsPerProfessorAll = allProfEntries.map(([id, count]) => ({
    name: profName.get(id) ?? id.slice(0, 8),
    count,
  }));

  const sessionCountBySim = new Map<string, number>();
  for (const row of sessionAgg) {
    sessionCountBySim.set(row.simulation_id, parseSessionCount(row.session_count));
  }

  const simTitleById = new Map(simulations.map((s) => [s.id, s.title.trim()]));
  type TitleAgg = { displayTitle: string; sessions: number };
  const byTitleKey = new Map<string, TitleAgg>();
  for (const [simId, sessionCount] of sessionCountBySim) {
    const rawTitle = simTitleById.get(simId) ?? "";
    if (isJunkAnalyticsTitle(rawTitle)) continue;
    const key = normalizeSimTitleKey(rawTitle);
    if (!key) continue;
    const prev = byTitleKey.get(key);
    if (!prev) {
      byTitleKey.set(key, { displayTitle: rawTitle, sessions: sessionCount });
    } else {
      byTitleKey.set(key, {
        displayTitle: rawTitle.length > prev.displayTitle.length ? rawTitle : prev.displayTitle,
        sessions: prev.sessions + sessionCount,
      });
    }
  }
  const topSimulationsBySessionsAll = [...byTitleKey.values()]
    .sort((a, b) => b.sessions - a.sessions)
    .map(({ displayTitle, sessions }) => ({
      title: displayTitle.slice(0, 80),
      sessions,
    }));

  const publicSimulationCount = simulations.filter((s) => s.is_public).length;
  const pinnedSimulationCount = simulations.filter((s) => s.is_pinned).length;
  const totalFavoritesOnPublic = simulations
    .filter((s) => s.is_public)
    .reduce((acc, s) => acc + (s.favorite_count ?? 0), 0);

  const subscriptionActiveCount = subscriptions.filter(
    (s) => s.status === "active" || s.status === "trialing"
  ).length;

  const summary: AdminAnalyticsViewData["summary"] = {
    professorCount,
    studentRoleCount,
    simulationCount: simulations.length,
    publicSimulationCount,
    pinnedSimulationCount,
    totalFavoritesOnPublic,
    subscriptionActiveCount,
    sessionsLast30NonPreview,
    participantsLast30,
    responsesLast30,
  };

  return {
    summary,
    simulationsPerProfessor: simulationsPerProfessorAll.slice(0, 15),
    sessionsPerDay,
    participantsPerDay,
    responsesPerDay,
    topSimulationsBySessions: topSimulationsBySessionsAll.slice(0, 12),
    simulationsPerProfessorAll,
    topSimulationsBySessionsAll,
    sessionsPerDay365,
    participantsPerDay365,
    responsesPerDay365,
  };
}

export async function buildAdminAnalyticsPayload(
  svc: SupabaseClient<Database>
): Promise<AdminAnalyticsPayload> {
  const v = await buildAdminAnalyticsViewData(svc);
  return {
    summary: v.summary,
    simulationsPerProfessor: v.simulationsPerProfessorAll.slice(0, 15),
    sessionsPerDay: v.sessionsPerDay,
    participantsPerDay: v.participantsPerDay,
    responsesPerDay: v.responsesPerDay,
    topSimulationsBySessions: v.topSimulationsBySessionsAll.slice(0, 12),
  };
}
