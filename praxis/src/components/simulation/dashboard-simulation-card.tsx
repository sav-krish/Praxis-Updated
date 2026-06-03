"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  Play,
  BarChart3,
  Share2,
  Users,
  CircleDot,
} from "lucide-react";
import { PreviewSimulationButton } from "@/components/simulation/PreviewSimulationButton";
import { DeleteSimulationDropdownItem } from "@/app/(dashboard)/dashboard/delete-simulation-dropdown-item";
import { appTileBackgroundForDifficulty } from "@/lib/app-tile-backgrounds";
import {
  SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS,
  SIMULATION_CARD_HEADER_CLASS,
  SIMULATION_CARD_TILE_SURFACE_CLASS,
  SIMULATION_CARD_TITLE_CLASS,
} from "@/lib/simulation-card-layout";

export type DashboardSimulationRow = {
  id: string;
  title: string;
  course_topic: string;
  mode: string;
  difficulty: string | null;
  updated_at: string;
};

type DashboardSimulationCardProps = {
  simulation: DashboardSimulationRow;
  activeSession?: { id: string; status: string };
  hasReports: boolean;
};

function difficultyBadgeLabel(difficulty: string | null): string {
  if (difficulty === "easy") return "Easy";
  if (difficulty === "challenge") return "Challenge";
  return "Hard";
}

/**
 * @description Professor dashboard simulation tile with edit/play/preview/reports/share/teams/delete and optional active session affordances.
 * @param simulation — Simulation row powering labels and gradients.
 * @param activeSession — When set (has `id`), exposes resume-to-lobby entry points for an in-flight session.
 * @param hasReports — Whether Reports navigation targets exist for this simulation.
 */

export function DashboardSimulationCard({
  simulation,
  activeSession,
  hasReports,
}: DashboardSimulationCardProps) {
  const hasSession = !!activeSession;
  const isRunning = activeSession?.status === "running";
  const isScheduled = activeSession?.status === "lobby";
  const isTeams = simulation.mode === "teams";
  const tile = appTileBackgroundForDifficulty(simulation.difficulty);

  return (
    <Card
      className={`${SIMULATION_CARD_TILE_SURFACE_CLASS} ${tile}`}
    >
      {hasSession && (
        <div
          className={`absolute inset-x-0 top-0 h-1 ${isRunning ? "bg-emerald-500/80" : "bg-amber-500/80"}`}
          aria-hidden
        />
      )}
      <CardHeader className={SIMULATION_CARD_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className={SIMULATION_CARD_TITLE_CLASS}>
              {simulation.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="border-0 bg-white/70 text-xs font-medium text-ink backdrop-blur-sm"
              >
                {simulation.course_topic}
              </Badge>
              {isTeams ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-ink/15 bg-white/55 text-xs font-medium text-ink backdrop-blur-sm"
                >
                  <Users className="h-3 w-3" aria-hidden />
                  Teams
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 border-ink/15 bg-white/55 text-xs font-medium text-ink backdrop-blur-sm"
                >
                  {difficultyBadgeLabel(simulation.difficulty)}
                </Badge>
              )}
              {isRunning && (
                <Badge className="gap-1 border-0 bg-emerald-500/15 text-xs font-medium text-emerald-700">
                  <CircleDot className="h-3 w-3 animate-pulse" aria-hidden />
                  Live
                </Badge>
              )}
              {isScheduled && (
                <Badge className="border-0 bg-amber-500/15 text-xs font-medium text-amber-700">
                  Scheduled
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-text hover:bg-white/60"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/edit/${simulation.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={
                    hasSession
                      ? `/session/${simulation.id}/${activeSession.id}`
                      : `/session/${simulation.id}/new`
                  }
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isRunning ? "Continue Session" : isScheduled ? "Open Scheduled Session" : "Start Session"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/share/${simulation.id}`}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Link>
              </DropdownMenuItem>
              <PreviewSimulationButton simulationId={simulation.id} asDropdownItem />
              {hasReports && (
                <DropdownMenuItem asChild>
                  <Link href={`/reports/${simulation.id}`}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Reports
                  </Link>
                </DropdownMenuItem>
              )}
              <DeleteSimulationDropdownItem
                simulationId={simulation.id}
                simulationTitle={simulation.title}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 pt-0">
        <p className="text-xs text-muted-text">
          Updated {new Date(simulation.updated_at).toLocaleDateString()}
        </p>
        <div className="flex gap-2">
          <Link href={`/edit/${simulation.id}`} className="flex-1 min-w-0">
            <Button
              variant="outline"
              className={`w-full ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} border-ink/15 bg-white/75 text-ink backdrop-blur-sm hover:bg-white`}
              size="sm"
            >
              <Edit className="mr-2 h-4 w-4 shrink-0" />
              Edit
            </Button>
          </Link>
          <Link
            href={
              hasSession
                ? `/session/${simulation.id}/${activeSession.id}`
                : `/session/${simulation.id}/new`
            }
            className="flex-1 min-w-0"
          >
            <Button
              className={`w-full ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} shadow-sm ${
                isRunning
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : isScheduled
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-ink text-white hover:bg-ink/90"
              }`}
              size="sm"
            >
              <Play className="mr-2 h-4 w-4 shrink-0" />
              {isRunning ? "Continue" : isScheduled ? "Scheduled" : "Start"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
