"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/landing/fade-in";
import { APP_TILE_BACKGROUNDS } from "@/lib/app-tile-backgrounds";
import { SIMULATION_CARD_GRID_CLASS } from "@/lib/simulation-card-layout";
import { StudentSimulationTile } from "./student-simulation-card";
import { FileText } from "lucide-react";
import type {
  StudentAssignmentRow,
  StudentAttemptRow,
  StudentSimulationCard,
} from "@/lib/student/data";
import type { StudentTrack, StudentTrackId } from "@/lib/student/tracks";

type StudentDashboardViewProps = {
  displayName: string;
  assigned: StudentAssignmentRow[];
  completed: StudentAttemptRow[];
  exploreByTrack: Record<StudentTrackId, (StudentSimulationCard & { completed: boolean })[]>;
  tracks: StudentTrack[];
};

export function StudentDashboardView({
  displayName,
  assigned,
  completed,
  exploreByTrack,
  tracks,
}: StudentDashboardViewProps) {
  const [activeTrack, setActiveTrack] = useState<StudentTrackId>("consulting");

  const completedBySimulation = new Map(
    completed.map((attempt) => [attempt.simulation_id, attempt])
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <section
          className={`rounded-3xl border border-border p-6 sm:p-10 ${APP_TILE_BACKGROUNDS[0]} shadow-[0_12px_30px_rgba(128,52,20,0.08)]`}
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            Welcome, {displayName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-text">
            Practice real-world decisions, review your score, and learn from detailed feedback on every choice.
          </p>
        </section>
      </FadeIn>

      <Tabs defaultValue="my-simulations" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="my-simulations">My Simulations</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
        </TabsList>

        <TabsContent value="my-simulations" className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">Assigned</h2>
            {assigned.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border p-6 text-center">
                No assigned simulations yet. Browse Explore to practice on your own.
              </p>
            ) : (
              <div className={SIMULATION_CARD_GRID_CLASS}>
                {assigned.map((row) => {
                  const completedAttempt = completedBySimulation.get(row.simulation_id);
                  return (
                    <StudentSimulationTile
                      key={row.id}
                      simulation={row.simulation}
                      assignmentId={row.id}
                      dueDate={row.due_date}
                      completed={Boolean(completedAttempt)}
                      attemptId={completedAttempt?.id}
                      inProgressAttemptId={row.inProgressAttemptId}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-ink mb-4">Completed</h2>
            {completed.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border p-6 text-center">
                Finish a simulation to see your score and decision feedback here.
              </p>
            ) : (
              <div className={SIMULATION_CARD_GRID_CLASS}>
                {completed.map((attempt) => (
                  <StudentSimulationTile
                    key={attempt.id}
                    simulation={attempt.simulation}
                    completed
                    attemptId={attempt.id}
                    footer={
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-semibold text-[#9f3805] dark:text-[#ffad7a]">
                          Score: {attempt.score ?? 0}%
                        </span>
                        <Button asChild variant="outline" className="min-h-[44px]">
                          <Link href={`/student/reports/${attempt.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Report
                          </Link>
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="explore" className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => setActiveTrack(track.id)}
                aria-pressed={activeTrack === track.id}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTrack === track.id
                    ? "bg-primary text-white shadow-subtle"
                    : "bg-card text-ink border border-line hover:bg-accentSoft"
                }`}
              >
                {track.label}
              </button>
            ))}
          </div>

          {tracks
            .filter((track) => track.id === activeTrack)
            .map((track) => (
              <section key={track.id}>
                <h2 className="text-xl font-semibold text-ink">{track.label}</h2>
                <p className="mt-1 text-sm text-muted-text mb-4">{track.description}</p>
                {(exploreByTrack[track.id] ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border p-6 text-center">
                    No simulations in this track yet. Check back as the library grows.
                  </p>
                ) : (
                  <div className={SIMULATION_CARD_GRID_CLASS}>
                    {(exploreByTrack[track.id] ?? []).map((sim) => {
                      const completedAttempt = completedBySimulation.get(sim.id);
                      return (
                        <StudentSimulationTile
                          key={sim.id}
                          simulation={sim}
                          completed={sim.completed}
                          attemptId={completedAttempt?.id}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
