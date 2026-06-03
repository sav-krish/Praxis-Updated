import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Library as LibraryIcon, ArrowRight } from "lucide-react";
import { SIMULATION_DASHBOARD_LIST } from "@/lib/supabase-query-columns";
import {
  DashboardSimulationCard,
  type DashboardSimulationRow,
} from "@/components/simulation/dashboard-simulation-card";
import { FadeIn } from "@/components/landing/fade-in";
import { APP_TILE_BACKGROUNDS } from "@/lib/app-tile-backgrounds";
import {
  SIMULATION_CARD_GRID_CLASS,
  SIMULATION_CARD_GRID_ITEM_CLASS,
} from "@/lib/simulation-card-layout";
import { DashboardSimulationFilters } from "./dashboard-simulation-filters";
import type { Json } from "@/types/database";
import { getSimulationSessionSchedule } from "@/lib/session-schedule";

/**
 * Friendly rotating greetings. We pick deterministically per-hour per-user so:
 *   - The greeting changes throughout the day (feels alive).
 *   - It stays stable across re-renders within the hour (no hydration churn).
 */
const GREETINGS = [
  "Hello",
  "Welcome back",
  "Back at it again",
  "Hey",
  "Good to see you",
  "Ready when you are",
] as const;

function pickGreeting(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  return GREETINGS[Math.abs(h) % GREETINGS.length];
}

type DashboardSimRow = {
  id: string;
  title: string;
  course_topic: string | null;
  mode: string;
  difficulty: string | null;
  preferences: Json;
  updated_at: string;
};

function topicLabel(row: DashboardSimRow): string {
  return row.course_topic?.trim() || "Uncategorized";
}

/** Mirrors library filtering (q + subject + difficulty). */
function filterDashboardSimulations(
  rows: DashboardSimRow[],
  params: { q: string; subject: string; difficulty: string }
): DashboardSimRow[] {
  let list = [...rows];
  const qTrim = params.q.trim().toLowerCase();
  if (qTrim) {
    list = list.filter((s) => {
      const title = (s.title || "").toLowerCase();
      const topic = topicLabel(s).toLowerCase();
      return title.includes(qTrim) || topic.includes(qTrim);
    });
  }
  if (params.subject && params.subject !== "all") {
    list = list.filter((s) => topicLabel(s) === params.subject);
  }
  if (params.difficulty && params.difficulty !== "all") {
    list = list.filter((s) => s.difficulty === params.difficulty);
  }
  return list;
}

interface DashboardPageProps {
  searchParams: Promise<{ q?: string; subject?: string; difficulty?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { q, subject, difficulty } = await searchParams;
  const qTrim = (q ?? "").trim();
  const subjectParam = subject ?? "all";
  const difficultyParam = difficulty ?? "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: allSimulations } = await supabase
    .from("simulations")
    .select(SIMULATION_DASHBOARD_LIST)
    .eq("professor_id", user.id)
    .order("updated_at", { ascending: false });

  const rows = (allSimulations ?? []) as DashboardSimRow[];

  const subjects = Array.from(new Set(rows.map(topicLabel))).sort();

  const simulations = filterDashboardSimulations(rows, {
    q: qTrim,
    subject: subjectParam,
    difficulty: difficultyParam,
  });

  const simulationIds = simulations.map((s) => s.id);
  const { data: completedSessions } =
    simulationIds.length > 0
      ? await supabase
          .from("sessions")
          .select("simulation_id")
          .in("simulation_id", simulationIds)
          .eq("status", "complete")
      : { data: [] as { simulation_id: string }[] };

  const simulationsWithReports = new Set(completedSessions?.map((s) => s.simulation_id) || []);

  const allSimIds = rows.map((s) => s.id);
  const { data: runningSessions } = allSimIds.length > 0
    ? await supabase
        .from("sessions")
        .select("id, simulation_id, status")
        .in("simulation_id", allSimIds)
        .neq("status", "complete")
        .neq("is_preview", true)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; simulation_id: string; status: string }[] };

  const simulationById = new Map(rows.map((row) => [row.id, row]));
  const sessionBySimulation = (runningSessions || []).reduce<Record<string, { id: string; status: string }>>((acc, s) => {
    const simulation = simulationById.get(s.simulation_id);
    if (!simulation) return acc;

    if (s.status === "lobby") {
      const schedule = getSimulationSessionSchedule(simulation.preferences);
      const scheduledStart = schedule.start_at ? new Date(schedule.start_at).getTime() : null;
      if (!scheduledStart || scheduledStart <= Date.now()) {
        return acc;
      }
    }

    if (!acc[s.simulation_id]) acc[s.simulation_id] = { id: s.id, status: s.status };
    return acc;
  }, {});

  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "there";
  const greetingSeed = `${user.id}-${new Date().toISOString().slice(0, 13)}`;
  const greeting = pickGreeting(greetingSeed);

  const quickActions = [
    {
      href: "/create",
      icon: Sparkles,
      label: "Generate a simulation from your materials",
    },
    {
      href: "/library",
      icon: LibraryIcon,
      label: "Browse our ready-made simulation library",
    },
    {
      href: "/create",
      icon: Plus,
      label: "Create simulation",
    },
  ];

  const hasActiveFilters =
    qTrim.length > 0 || subjectParam !== "all" || difficultyParam !== "all";

  return (
    <div>
      <FadeIn>
        <section
          className={`mb-6 sm:mb-8 rounded-3xl border border-border p-6 sm:p-10 ${APP_TILE_BACKGROUNDS[0]} shadow-[0_12px_30px_rgba(15,36,71,0.08)]`}
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            {greeting}, {displayName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-text">
            Pick how you&apos;d like to start.
          </p>

          <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-3">
            {quickActions.map(({ href, icon: Icon, label }) => (
              <Link key={label} href={href} className="group">
                <div className="flex h-full items-center justify-between gap-4 rounded-2xl bg-white/85 p-4 sm:p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-soft">
                  <div className="flex items-center gap-3 text-ink">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm sm:text-base font-semibold leading-snug">{label}</span>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-text transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </FadeIn>

      {rows.length > 0 && (
        <Suspense fallback={<div className="mb-6 h-10 animate-pulse rounded-md bg-muted/60" aria-hidden />}>
          <DashboardSimulationFilters
            subjects={subjects}
            currentQuery={qTrim}
            currentSubject={subjectParam}
            currentDifficulty={difficultyParam}
          />
        </Suspense>
      )}

      {rows.length > 0 && simulations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No simulations match your filters.</p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/dashboard">Clear filters</Link>
            </Button>
          )}
        </div>
      )}

      {simulations.length > 0 && (
        <div
          id="your-simulations"
          className={`${SIMULATION_CARD_GRID_CLASS} scroll-mt-24`}
        >
          {simulations.map((simulation) => {
            const activeSession = sessionBySimulation[simulation.id];
            return (
              <div key={simulation.id} className={SIMULATION_CARD_GRID_ITEM_CLASS}>
                <DashboardSimulationCard
                  simulation={simulation as DashboardSimulationRow}
                  activeSession={activeSession}
                  hasReports={simulationsWithReports.has(simulation.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
