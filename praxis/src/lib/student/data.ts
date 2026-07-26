import { createClient } from "@/lib/supabase/server";
import { trackForSimulation, STUDENT_TRACKS, type StudentTrackId } from "./tracks";

export type StudentSimulationCard = {
  id: string;
  title: string;
  course_topic: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  trackId: StudentTrackId;
  trackLabel: string;
};

export type StudentAssignmentRow = {
  id: string;
  simulation_id: string;
  due_date: string | null;
  assigned_at: string;
  simulation: StudentSimulationCard;
  inProgressAttemptId?: string;
};

export type StudentAttemptRow = {
  id: string;
  simulation_id: string;
  status: "in_progress" | "completed";
  score: number;
  source: "classroom" | "explore";
  started_at: string;
  completed_at: string | null;
  simulation: StudentSimulationCard;
};

const PUBLIC_SIM_COLUMNS =
  "id, title, course_topic, difficulty, estimated_minutes" as const;

export async function fetchStudentDashboardData(userId: string) {
  const supabase = await createClient();

  const [
    { data: profile },
    { data: assignments },
    { data: attempts },
    { data: publicSims },
  ] = await Promise.all([
    supabase.from("student_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("student_simulation_assignments")
      .select(
        `id, simulation_id, due_date, assigned_at,
         simulation:simulations(${PUBLIC_SIM_COLUMNS})`
      )
      .eq("student_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("student_simulation_attempts")
      .select(
        `id, simulation_id, session_id, participant_id, status, score, source, started_at, completed_at,
         simulation:simulations(${PUBLIC_SIM_COLUMNS})`
      )
      .eq("student_id", userId)
      .order("started_at", { ascending: false }),
    supabase
      .from("simulations")
      .select(PUBLIC_SIM_COLUMNS)
      .eq("is_public", true)
      .order("favorite_count", { ascending: false }),
  ]);

  const completedAttempts = (attempts ?? []).filter((a) => a.status === "completed");
  const inProgressAttempts = (attempts ?? []).filter((a) => a.status === "in_progress");

  const completedSimulationIds = new Set(
    completedAttempts.map((a) => a.simulation_id)
  );

  const inProgressBySimulation = new Map<string, string>();
  for (const a of inProgressAttempts) {
    if (!inProgressBySimulation.has(a.simulation_id)) {
      inProgressBySimulation.set(a.simulation_id, a.id);
    }
  }

  const assignedNotCompleted = (assignments ?? []).filter(
    (row) => !completedSimulationIds.has(row.simulation_id)
  );

  function toCard(
    sim: {
      id: string;
      title: string;
      course_topic: string | null;
      difficulty: string | null;
      estimated_minutes: number | null;
    } | null
  ): StudentSimulationCard | null {
    if (!sim) return null;
    const track = trackForSimulation(sim);
    return {
      id: sim.id,
      title: sim.title,
      course_topic: sim.course_topic,
      difficulty: sim.difficulty,
      estimated_minutes: sim.estimated_minutes,
      trackId: track.id,
      trackLabel: track.label,
    };
  }

  const exploreByTrack = Object.fromEntries(
    STUDENT_TRACKS.map((track) => [track.id, [] as (StudentSimulationCard & { completed: boolean })[]])
  ) as Record<StudentTrackId, (StudentSimulationCard & { completed: boolean })[]>;

  for (const sim of publicSims ?? []) {
    const track = trackForSimulation(sim);
    const card = toCard(sim);
    if (!card) continue;
    exploreByTrack[track.id].push({
      ...card,
      completed: completedSimulationIds.has(sim.id),
    });
  }

  return {
    profile,
    assigned: assignedNotCompleted
      .map((row) => {
        const simulation = toCard(
          row.simulation as {
            id: string;
            title: string;
            course_topic: string | null;
            difficulty: string | null;
            estimated_minutes: number | null;
          } | null
        );
        if (!simulation) return null;
        const attemptId = inProgressBySimulation.get(row.simulation_id);
        return {
          id: row.id,
          simulation_id: row.simulation_id,
          due_date: row.due_date,
          assigned_at: row.assigned_at,
          simulation,
          ...(attemptId ? { inProgressAttemptId: attemptId } : {}),
        } satisfies StudentAssignmentRow;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
    completed: completedAttempts
      .map((row) => {
        const simulation = toCard(
          row.simulation as {
            id: string;
            title: string;
            course_topic: string | null;
            difficulty: string | null;
            estimated_minutes: number | null;
          } | null
        );
        if (!simulation) return null;
        return {
          id: row.id,
          simulation_id: row.simulation_id,
          status: row.status,
          score: row.score ?? 0,
          source: row.source,
          started_at: row.started_at,
          completed_at: row.completed_at,
          simulation,
        } as StudentAttemptRow;
      })
      .filter((row): row is StudentAttemptRow => row !== null),
    inProgress: inProgressAttempts,
    exploreByTrack,
    tracks: STUDENT_TRACKS,
  };
}