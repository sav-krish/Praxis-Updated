"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, FileText } from "lucide-react";
import { toast } from "sonner";
import { appTileBackgroundForDifficulty } from "@/lib/app-tile-backgrounds";
import { studentDifficultyLabel } from "@/lib/student/tracks";
import {
  SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS,
  SIMULATION_CARD_GRID_ITEM_CLASS,
  SIMULATION_CARD_HEADER_CLASS,
  SIMULATION_CARD_TILE_SURFACE_CLASS,
  SIMULATION_CARD_TITLE_CLASS,
} from "@/lib/simulation-card-layout";
import type { StudentSimulationCard } from "@/lib/student/data";

type StartSimulationButtonProps = {
  simulationId: string;
  assignmentId?: string;
  source?: "explore" | "classroom";
  label?: string;
  disabled?: boolean;
  className?: string;
};

export function StartSimulationButton({
  simulationId,
  assignmentId,
  source = "explore",
  label = "Start",
  disabled = false,
  className,
}: StartSimulationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
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
            attemptId: string;
          }
        | { error?: string }
        | null;

      if (!response.ok || !result || !("joinCode" in result)) {
        throw new Error(result && "error" in result ? result.error : "Failed to start simulation");
      }

      sessionStorage.setItem(`participant_${result.sessionId}`, result.participantId);
      sessionStorage.setItem(`participant_name_${result.sessionId}`, result.participantName);
      sessionStorage.setItem(`student_attempt_${result.sessionId}`, result.attemptId);

      router.push(`/play/${result.joinCode}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start simulation");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      className={`${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} ${className ?? ""}`}
      disabled={disabled || loading}
      onClick={() => void handleStart()}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Play className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

type StudentSimulationTileProps = {
  simulation: StudentSimulationCard;
  completed?: boolean;
  attemptId?: string;
  assignmentId?: string;
  dueDate?: string | null;
  footer?: React.ReactNode;
  inProgressAttemptId?: string;
};

export function StudentSimulationTile({
  simulation,
  completed = false,
  attemptId,
  assignmentId,
  dueDate,
  footer,
  inProgressAttemptId,
}: StudentSimulationTileProps) {
  const tile = appTileBackgroundForDifficulty(simulation.difficulty);

  return (
    <div className={SIMULATION_CARD_GRID_ITEM_CLASS}>
      <Card className={`${SIMULATION_CARD_TILE_SURFACE_CLASS} ${tile} h-full`}>
        <CardHeader className={SIMULATION_CARD_HEADER_CLASS}>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className={SIMULATION_CARD_TITLE_CLASS}>{simulation.title}</CardTitle>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {studentDifficultyLabel(simulation.difficulty)}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2 text-muted-text">
            {simulation.course_topic?.trim() || simulation.trackLabel}
            {simulation.estimated_minutes
              ? ` · ~${simulation.estimated_minutes} min`
              : ""}
          </CardDescription>
          {dueDate ? (
            <p className="text-xs text-muted-foreground mt-1">
              Due {new Date(dueDate).toLocaleDateString()}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="mt-auto flex flex-wrap gap-2 pt-0">
          {footer ?? (
            <>
              {completed && attemptId ? (
                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <StartSimulationButton
                    simulationId={simulation.id}
                    assignmentId={assignmentId}
                    source={assignmentId ? "classroom" : "explore"}
                    label="Start"
                    className="flex-1"
                  />
                  <Button
                    asChild
                    variant="outline"
                    className={`flex-1 ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS}`}
                  >
                    <Link href={`/student/reports/${attemptId}`}>
                      <FileText className="mr-2 h-4 w-4" />
                      View Report
                    </Link>
                  </Button>
                </div>
              ) : inProgressAttemptId ? (
                <StartSimulationButton
                  simulationId={simulation.id}
                  assignmentId={assignmentId}
                  source={assignmentId ? "classroom" : "explore"}
                  label="Continue"
                  className="w-full"
                />
              ) : (
                <StartSimulationButton
                  simulationId={simulation.id}
                  assignmentId={assignmentId}
                  source={assignmentId ? "classroom" : "explore"}
                  label={assignmentId ? "Start" : "Start"}
                  className="w-full"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
