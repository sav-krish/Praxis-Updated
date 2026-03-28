"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Play, BarChart3, Share2 } from "lucide-react";
import { PreviewSimulationButton } from "@/components/simulation/PreviewSimulationButton";
import { DeleteSimulationDropdownItem } from "@/app/(dashboard)/dashboard/delete-simulation-dropdown-item";

export type DashboardSimulationRow = {
  id: string;
  title: string;
  course_topic: string;
  mode: string;
  updated_at: string;
};

type DashboardSimulationCardProps = {
  simulation: DashboardSimulationRow;
  activeSession?: { id: string };
  hasReports: boolean;
};

export function DashboardSimulationCard({
  simulation,
  activeSession,
  hasReports,
}: DashboardSimulationCardProps) {
  const isActive = !!activeSession;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="line-clamp-1">{simulation.title}</CardTitle>
            <CardDescription>
              <Badge variant="secondary" className="text-xs">
                {simulation.course_topic}
              </Badge>
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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
                    isActive
                      ? `/session/${simulation.id}/${activeSession.id}`
                      : `/session/${simulation.id}/new`
                  }
                >
                  <Play className="mr-2 h-4 w-4" />
                  {isActive ? "Continue Session" : "Start Session"}
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
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-1 text-sm text-muted-foreground">
          <span>{simulation.mode === "teams" ? "Team Mode" : "Individual Mode"}</span>
          <span className="text-xs sm:text-sm">
            Updated {new Date(simulation.updated_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2 mt-4">
          <Link href={`/edit/${simulation.id}`} className="flex-1 min-w-0">
            <Button variant="outline" className="w-full min-h-[44px]" size="sm">
              <Edit className="mr-2 h-4 w-4 shrink-0" />
              Edit
            </Button>
          </Link>
          <Link
            href={
              isActive
                ? `/session/${simulation.id}/${activeSession.id}`
                : `/session/${simulation.id}/new`
            }
            className="flex-1 min-w-0"
          >
            <Button
              className={`w-full min-h-[44px] ${isActive ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              size="sm"
            >
              <Play className="mr-2 h-4 w-4 shrink-0" />
              {isActive ? "Continue" : "Start"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
