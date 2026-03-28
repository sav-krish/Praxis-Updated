"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Clock, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { copySimulationToAccount } from "@/app/(dashboard)/share/[id]/actions";
import type { LibrarySimulationRow } from "@/types/library";

function difficultyLabel(d: string | null) {
  if (d === "easy") return "Easy";
  if (d === "hard") return "Hard";
  if (d === "challenge") return "Challenge";
  return d;
}

type LibrarySimulationCardProps = {
  sim: LibrarySimulationRow;
  isFavorite: boolean;
  favoritePending: boolean;
  onToggleFavorite: () => void;
};

export function LibrarySimulationCard({
  sim,
  isFavorite,
  favoritePending,
  onToggleFavorite,
}: LibrarySimulationCardProps) {
  const router = useRouter();
  const [usingSim, setUsingSim] = useState(false);
  const authorName = sim.professors?.name || "Anonymous";

  const handleUseSimulation = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUsingSim(true);
    const result = await copySimulationToAccount(sim.id);
    setUsingSim(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Simulation added to your dashboard");
    router.push(`/edit/${result.newId}`);
  };

  return (
    <Card className="group hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
            {sim.title}
          </CardTitle>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite();
            }}
            disabled={favoritePending}
            className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label={isFavorite ? "Unfavorite" : "Favorite"}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
              }`}
            />
          </button>
        </div>
        <CardDescription className="text-xs">by {authorName}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {sim.course_topic}
          </Badge>
          {sim.difficulty && (
            <Badge variant="outline" className="text-xs">
              {difficultyLabel(sim.difficulty)}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {sim.favorite_count}
          </span>
          {sim.estimated_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{sim.estimated_minutes} min
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            className="flex-1 min-h-[40px]"
            size="sm"
            onClick={handleUseSimulation}
            disabled={usingSim}
          >
            {usingSim ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : null}
            Use simulation
          </Button>
          <Link href={`/edit/${sim.id}`} className="flex-1 min-w-0">
            <Button variant="outline" size="sm" className="w-full min-h-[40px]">
              <ExternalLink className="h-4 w-4 shrink-0 mr-1.5" />
              View details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
