"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APP_TILE_BACKGROUNDS, appTileBackgroundForDifficulty } from "@/lib/app-tile-backgrounds";
import {
  SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS,
  SIMULATION_CARD_HEADER_CLASS,
  SIMULATION_CARD_TILE_SURFACE_CLASS,
  SIMULATION_CARD_TITLE_CLASS,
} from "@/lib/simulation-card-layout";
import {
  type StudentTrack,
  studentDifficultyLabel,
} from "@/lib/student/tracks";

export type StudentSimulationSummary = {
  id: string;
  title: string;
  course_topic: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
};

export type AssignedStudentSimulation = {
  assignmentId: string;
  simulation: StudentSimulationSummary;
  dueDate: string | null;
  status: "not_started" | "in_progress";
  attemptId: string | null;
};

export type CompletedStudentSimulation = {
  attemptId: string;
  simulation: StudentSimulationSummary;
  completedAt: string | null;
  score: number | null;
  source: "classroom" | "explore";
};

export type ExploreStudentSimulation = {
  simulation: StudentSimulationSummary;
  track: StudentTrack;
  completedAttemptId: string | null;
  inProgressAttemptId: string | null;
};

type StudentDashboardViewProps = {
  studentName: string;
  assigned: AssignedStudentSimulation[];
  completed: CompletedStudentSimulation[];
  explore: ExploreStudentSimulation[];
  initialTab?: "my" | "explore";
};

function formatDate(value: string | null): string {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function topic(simulation: StudentSimulationSummary): string {
  return simulation.course_topic?.trim() || "Uncategorized";
}

function subjectFilterValue(simulation: StudentSimulationSummary): string {
  return topic(simulation).replace(/\s+/g, " ").toLowerCase();
}

function StudentSimCard({
  simulation,
  eyebrow,
  meta,
  status,
  score,
  primaryLabel,
  reportHref,
  reportDisabled,
  onStart,
  starting,
}: {
  simulation: StudentSimulationSummary;
  eyebrow: string;
  meta: string;
  status?: string;
  score?: number | null;
  primaryLabel: string;
  reportHref?: string;
  reportDisabled?: boolean;
  onStart: () => void;
  starting: boolean;
}) {
  const tile = appTileBackgroundForDifficulty(simulation.difficulty);

  return (
    <Card className={`${SIMULATION_CARD_TILE_SURFACE_CLASS} ${tile}`}>
      <CardHeader className={SIMULATION_CARD_HEADER_CLASS}>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="border-0 bg-white/75 text-xs font-medium text-ink backdrop-blur-sm">
              {eyebrow}
            </Badge>
            {status ? (
              <Badge variant="outline" className="border-ink/15 bg-white/55 text-xs text-ink">
                {status}
              </Badge>
            ) : null}
          </div>
          <CardTitle className={SIMULATION_CARD_TITLE_CLASS}>
            {simulation.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 pt-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="border-0 bg-white/70 text-xs font-medium text-ink">
            {topic(simulation)}
          </Badge>
          <Badge variant="outline" className="border-ink/15 bg-white/55 text-xs font-medium text-ink">
            {studentDifficultyLabel(simulation.difficulty)}
          </Badge>
          {simulation.estimated_minutes ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-ink/15 bg-white/55 px-2 py-0.5 text-xs font-medium text-ink">
              <Clock className="h-3 w-3" />
              ~{simulation.estimated_minutes} min
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-text">
          <span>{meta}</span>
          {score != null ? <span className="font-semibold text-ink">{score}%</span> : null}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className={`flex-1 ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} bg-ink text-white shadow-sm hover:bg-ink/90`}
            disabled={starting}
            onClick={onStart}
          >
            {starting ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4 shrink-0" />
            )}
            {primaryLabel}
          </Button>
          {reportHref && !reportDisabled ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className={`flex-1 ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} border-ink/15 bg-white/75 text-ink hover:bg-white`}
            >
              <Link href={reportHref}>
                <BarChart3 className="mr-2 h-4 w-4 shrink-0" />
                Report
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className={`flex-1 ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} border-ink/10 bg-white/45 text-muted-text`}
              disabled
            >
              <BarChart3 className="mr-2 h-4 w-4 shrink-0" />
              Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentDashboardView({
  studentName,
  assigned,
  completed,
  explore,
  initialTab = "my",
}: StudentDashboardViewProps) {
  const router = useRouter();
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("all");

  const subjectAreas = useMemo(() => {
    const subjects = new Map<string, string>();
    for (const item of explore) {
      const label = topic(item.simulation).replace(/\s+/g, " ");
      const value = subjectFilterValue(item.simulation);
      if (!subjects.has(value)) subjects.set(value, label);
    }
    return Array.from(subjects, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [explore]);

  const filteredExplore = useMemo(
    () =>
      subjectFilter === "all"
        ? explore
        : explore.filter((item) => subjectFilterValue(item.simulation) === subjectFilter),
    [explore, subjectFilter],
  );

  const selectedSubjectLabel =
    subjectAreas.find((subject) => subject.value === subjectFilter)?.label ?? null;

  const startSimulation = async (
    simulationId: string,
    source: "classroom" | "explore",
    assignmentId?: string | null
  ) => {
    const key = `${simulationId}:${assignmentId ?? source}`;
    setStartingKey(key);
    try {
      const response = await fetch(`/api/student/simulations/${simulationId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, assignmentId }),
      });
      const result = (await response.json().catch(() => null)) as
        | {
            joinCode: string;
            sessionId: string;
            participantId: string;
            participantName: string;
            participantUserId: string;
            attemptId: string;
          }
        | { error?: string }
        | null;

      if (!response.ok || !result || !("joinCode" in result)) {
        throw new Error(result && "error" in result ? result.error : "Failed to start simulation");
      }

      sessionStorage.setItem(`participant_${result.sessionId}`, result.participantId);
      sessionStorage.setItem(`participant_name_${result.sessionId}`, result.participantName);
      sessionStorage.setItem(`participant_owner_${result.sessionId}`, result.participantUserId);
      sessionStorage.setItem(`student_attempt_${result.sessionId}`, result.attemptId);
      router.push(`/play/${result.joinCode}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start simulation");
    } finally {
      setStartingKey(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section
        className={`rounded-3xl border border-border p-6 shadow-[var(--shadow-soft)] sm:p-8 ${APP_TILE_BACKGROUNDS[1]}`}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-ink">
              <BookOpen className="h-3.5 w-3.5" />
              Student Dashboard
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Welcome back, {studentName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-text sm:text-base">
              Keep up with assigned simulations, review completed work, and practice by track.
            </p>
            <Button asChild size="lg" className="mt-5 min-h-14 w-full rounded-xl text-base shadow-sm sm:w-auto">
              <Link href="/join">
                Join a live session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <div className="rounded-2xl bg-white/75 p-3 text-center">
              <p className="text-2xl font-bold text-ink">{assigned.length}</p>
              <p className="text-xs text-muted-text">Assigned</p>
            </div>
            <div className="rounded-2xl bg-white/75 p-3 text-center">
              <p className="text-2xl font-bold text-ink">{completed.length}</p>
              <p className="text-xs text-muted-text">Completed</p>
            </div>
            <div className="rounded-2xl bg-white/75 p-3 text-center">
              <p className="text-2xl font-bold text-ink">{explore.length}</p>
              <p className="text-xs text-muted-text">Explore</p>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="grid h-auto min-h-[44px] w-full max-w-md grid-cols-2 bg-white/80 p-1">
          <TabsTrigger value="my" className="py-2">My Simulations</TabsTrigger>
          <TabsTrigger value="explore" className="py-2">Explore Simulations</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Assigned Simulations</h2>
              <p className="text-sm text-muted-text">Classroom work from your instructor.</p>
            </div>
            {assigned.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {assigned.map((item) => (
                  <StudentSimCard
                    key={item.assignmentId}
                    simulation={item.simulation}
                    eyebrow="Assigned"
                    meta={`Due ${formatDate(item.dueDate)}`}
                    status={item.status === "in_progress" ? "In progress" : "Not started"}
                    primaryLabel={item.status === "in_progress" ? "Continue" : "Start"}
                    reportDisabled
                    onStart={() => startSimulation(item.simulation.id, "classroom", item.assignmentId)}
                    starting={startingKey === `${item.simulation.id}:${item.assignmentId}`}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white/65 p-6 text-sm text-muted-text">
                No assigned simulations yet.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Completed Simulations</h2>
              <p className="text-sm text-muted-text">Review your score, choices, and explanations.</p>
            </div>
            {completed.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {completed.map((item) => (
                  <StudentSimCard
                    key={item.attemptId}
                    simulation={item.simulation}
                    eyebrow={item.source === "classroom" ? "Classroom" : "Practice"}
                    meta={`Completed ${formatDate(item.completedAt)}`}
                    status="Completed"
                    score={item.score}
                    primaryLabel="Start"
                    reportHref={`/student/reports/${item.attemptId}`}
                    onStart={() => startSimulation(item.simulation.id, item.source)}
                    starting={startingKey === `${item.simulation.id}:${item.source}`}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white/65 p-6 text-sm text-muted-text">
                Completed simulations will appear here after you finish one.
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="explore" className="space-y-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white/65 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-semibold text-ink">Find a simulation</p>
              <p className="text-sm text-muted-text" aria-live="polite">
                {selectedSubjectLabel
                  ? `Showing ${filteredExplore.length} ${selectedSubjectLabel} simulation${filteredExplore.length === 1 ? "" : "s"}.`
                  : `Showing all ${filteredExplore.length} published simulations.`}
              </p>
            </div>
            <div className="w-full sm:w-[220px]">
              <label htmlFor="student-explore-subject" className="mb-1.5 block text-xs font-medium text-muted-text">
                Subject area
              </label>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger id="student-explore-subject" className="h-11 w-full border-ink/15 bg-white text-ink">
                  <SelectValue placeholder="All subject areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subject areas</SelectItem>
                  {subjectAreas.map((subject) => (
                    <SelectItem key={subject.value} value={subject.value}>
                      {subject.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredExplore.length > 0 ? (
            <section aria-label={`${selectedSubjectLabel ?? "Explore"} simulations`}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredExplore.map((item) => {
                  const completedAttemptId = item.completedAttemptId;
                  const inProgressAttemptId = item.inProgressAttemptId;
                  return (
                    <StudentSimCard
                      key={item.simulation.id}
                      simulation={item.simulation}
                      eyebrow={topic(item.simulation)}
                      meta={
                        completedAttemptId
                          ? "Completed practice"
                          : inProgressAttemptId
                            ? "Practice in progress"
                            : "Not started"
                      }
                      status={
                        completedAttemptId
                          ? "Completed"
                          : inProgressAttemptId
                            ? "In progress"
                            : undefined
                      }
                      primaryLabel={inProgressAttemptId ? "Continue" : "Start"}
                      reportHref={
                        completedAttemptId ? `/student/reports/${completedAttemptId}` : undefined
                      }
                      reportDisabled={!completedAttemptId}
                      onStart={() => startSimulation(item.simulation.id, "explore")}
                      starting={startingKey === `${item.simulation.id}:explore`}
                    />
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white/65 p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-text" />
              <p className="font-medium text-ink">
                {subjectFilter === "all"
                  ? "No public simulations are available yet."
                  : `No ${selectedSubjectLabel ?? "matching"} simulations are available yet.`}
              </p>
              <p className="mt-1 text-sm text-muted-text">
                {subjectFilter === "all"
                  ? "Published library simulations will appear here."
                  : "Try another subject area to see more practice simulations."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
