import Link from "next/link";
import { Suspense } from "react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Sparkles, Library as LibraryIcon, ArrowRight } from "lucide-react";
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
import {
  StudentDashboardView,
  type AssignedStudentSimulation,
  type CompletedStudentSimulation,
  type ExploreStudentSimulation,
  type StudentSimulationSummary,
} from "@/components/student/student-dashboard-view";
import { trackForSimulation } from "@/lib/student/tracks";

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
  searchParams: Promise<{ q?: string; subject?: string; difficulty?: string; tab?: string }>;
}

type StudentProfileRow = {
  first_name: string | null;
  last_name: string | null;
};

type AssignmentRow = {
  id: string;
  due_date: string | null;
  simulation: StudentSimulationSummary | StudentSimulationSummary[] | null;
};

type AttemptRow = {
  id: string;
  simulation_id: string;
  assignment_id: string | null;
  source: "classroom" | "explore";
  status: "in_progress" | "completed";
  score: number | null;
  completed_at: string | null;
  started_at: string;
  simulation: StudentSimulationSummary | StudentSimulationSummary[] | null;
};

function normalizeStudentSimulation(
  simulation: StudentSimulationSummary | StudentSimulationSummary[] | null
): StudentSimulationSummary | null {
  if (Array.isArray(simulation)) return simulation[0] ?? null;
  return simulation;
}

async function loadStudentDashboardData(
  userId: string,
  fallbackName: string
): Promise<{
  studentName: string;
  assigned: AssignedStudentSimulation[];
  completed: CompletedStudentSimulation[];
  explore: ExploreStudentSimulation[];
}> {
  const svc = createServiceRoleClient();

  const [profileRes, assignmentsRes, attemptsRes, publicSimsRes] = await Promise.all([
    svc
      .from("student_profiles")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle(),
    svc
      .from("student_simulation_assignments")
      .select("id, due_date, simulation:simulations(id, title, course_topic, difficulty, estimated_minutes)")
      .eq("student_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    svc
      .from("student_simulation_attempts")
      .select("id, simulation_id, assignment_id, source, status, score, completed_at, started_at, simulation:simulations(id, title, course_topic, difficulty, estimated_minutes)")
      .eq("student_id", userId)
      .order("started_at", { ascending: false }),
    svc
      .from("simulations")
      .select("id, title, course_topic, difficulty, estimated_minutes")
      .eq("is_public", true)
      .order("is_pinned", { ascending: false })
      .order("pinned_order", { ascending: true, nullsFirst: false })
      .order("favorite_count", { ascending: false }),
  ]);

  const profile = profileRes.data as StudentProfileRow | null;
  const studentName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    fallbackName ||
    "there";

  const attemptRows = (attemptsRes.data ?? []) as AttemptRow[];
  const assignmentRows = (assignmentsRes.data ?? []) as AssignmentRow[];
  const completedAssignmentIds = new Set(
    attemptRows
      .filter((attempt) => attempt.status === "completed" && attempt.assignment_id)
      .map((attempt) => attempt.assignment_id as string)
  );
  const inProgressByAssignment = new Map(
    attemptRows
      .filter((attempt) => attempt.status === "in_progress" && attempt.assignment_id)
      .map((attempt) => [attempt.assignment_id as string, attempt])
  );

  const assigned: AssignedStudentSimulation[] = assignmentRows
    .filter((assignment) => !completedAssignmentIds.has(assignment.id))
    .map((assignment) => {
      const simulation = normalizeStudentSimulation(assignment.simulation);
      if (!simulation) return null;
      const inProgress = inProgressByAssignment.get(assignment.id);
      return {
        assignmentId: assignment.id,
        simulation,
        dueDate: assignment.due_date,
        status: inProgress ? "in_progress" : "not_started",
        attemptId: inProgress?.id ?? null,
      } satisfies AssignedStudentSimulation;
    })
    .filter((item): item is AssignedStudentSimulation => Boolean(item));

  const completed: CompletedStudentSimulation[] = attemptRows
    .filter((attempt) => attempt.status === "completed")
    .map((attempt) => {
      const simulation = normalizeStudentSimulation(attempt.simulation);
      if (!simulation) return null;
      return {
        attemptId: attempt.id,
        simulation,
        completedAt: attempt.completed_at,
        score: attempt.score,
        source: attempt.source,
      } satisfies CompletedStudentSimulation;
    })
    .filter((item): item is CompletedStudentSimulation => Boolean(item));

  const attemptsBySimulation = attemptRows.reduce<
    Record<string, { completed?: AttemptRow; inProgress?: AttemptRow }>
  >((acc, attempt) => {
    acc[attempt.simulation_id] ??= {};
    if (attempt.status === "completed" && !acc[attempt.simulation_id].completed) {
      acc[attempt.simulation_id].completed = attempt;
    }
    if (attempt.status === "in_progress" && !acc[attempt.simulation_id].inProgress) {
      acc[attempt.simulation_id].inProgress = attempt;
    }
    return acc;
  }, {});

  const explore: ExploreStudentSimulation[] = ((publicSimsRes.data ?? []) as StudentSimulationSummary[])
    .map((simulation) => {
      const attempts = attemptsBySimulation[simulation.id];
      return {
        simulation,
        track: trackForSimulation(simulation),
        completedAttemptId: attempts?.completed?.id ?? null,
        inProgressAttemptId: attempts?.inProgress?.id ?? null,
      };
    });

  return { studentName, assigned, completed, explore };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { q, subject, difficulty, tab } = await searchParams;
  const qTrim = (q ?? "").trim();
  const subjectParam = subject ?? "all";
  const difficultyParam = difficulty ?? "all";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: professorRole } = await supabase
    .from("professors")
    .select("active_role")
    .eq("id", user.id)
    .maybeSingle();

  if (professorRole?.active_role === "student") {
    const { data: existingProfile } = await supabase
      .from("student_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabase.from("student_profiles").insert({
        user_id: user.id,
        first_name: (user.user_metadata?.first_name as string) ?? "",
        last_name: (user.user_metadata?.last_name as string) ?? "",
        school: (user.user_metadata?.school as string) ?? "",
      });
    }

    const fallbackName =
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "there";
    const studentData = await loadStudentDashboardData(user.id, fallbackName);

    return (
      <StudentDashboardView
        studentName={studentData.studentName}
        assigned={studentData.assigned}
        completed={studentData.completed}
        explore={studentData.explore}
        initialTab={tab === "explore" ? "explore" : "my"}
      />
    );
  }

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

  const { data: studentAttemptSessions } = (runningSessions?.length ?? 0) > 0
    ? await supabase
        .from("student_simulation_attempts")
        .select("session_id")
        .in("session_id", runningSessions!.map((session) => session.id))
    : { data: [] as { session_id: string }[] };
  const studentAttemptSessionIds = new Set(
    studentAttemptSessions?.map((attempt) => attempt.session_id) ?? [],
  );

  const simulationById = new Map(rows.map((row) => [row.id, row]));
  const sessionBySimulation = (runningSessions || []).reduce<Record<string, { id: string; status: string }>>((acc, s) => {
    if (studentAttemptSessionIds.has(s.id)) return acc;
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

          <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2">
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
            const hasReports =
              simulationsWithReports.has(simulation.id) ||
              activeSession?.status === "running";
            return (
              <div key={simulation.id} className={SIMULATION_CARD_GRID_ITEM_CLASS}>
                <DashboardSimulationCard
                  simulation={simulation as DashboardSimulationRow}
                  activeSession={activeSession}
                  hasReports={hasReports}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
