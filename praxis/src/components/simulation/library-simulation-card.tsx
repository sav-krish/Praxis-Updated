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

/** Stable hash so the same simulation always gets the same fallback label. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** When the professor has no name on file, show a plausible display name (not a handle). */
const FALLBACK_FIRST = [
  "James",
  "Maria",
  "David",
  "Sarah",
  "Michael",
  "Emily",
  "Daniel",
  "Jessica",
  "Chris",
  "Ashley",
  "Ryan",
  "Nicole",
  "Kevin",
  "Amanda",
  "Brian",
  "Michelle",
  "Jason",
  "Laura",
  "Eric",
  "Rachel",
] as const;

const FALLBACK_LAST = [
  "Martinez",
  "Patel",
  "O'Brien",
  "Nakamura",
  "Kowalski",
  "Fernandez",
  "Reed",
  "Cho",
  "Silva",
  "Hughes",
  "Park",
  "Ibrahim",
  "Lindberg",
  "Okonkwo",
  "Tanaka",
  "Morrison",
  "Singh",
  "Costa",
  "Yilmaz",
  "Washington",
] as const;

function fallbackAuthorDisplayName(simId: string): string {
  const h = hashId(simId);
  const first = FALLBACK_FIRST[h % FALLBACK_FIRST.length];
  const last = FALLBACK_LAST[(h >>> 11) % FALLBACK_LAST.length];
  return `${first} ${last}`;
}

function displayAuthorName(sim: LibrarySimulationRow): string {
  const disclosed = sim.professors?.name?.trim();
  if (disclosed) return disclosed;
  return fallbackAuthorDisplayName(sim.id);
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
  const authorName = displayAuthorName(sim);

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
    <Card className="group flex h-full w-full min-w-0 flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-2 flex-1 min-w-0">
            {sim.title}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite();
              }}
              disabled={favoritePending}
              className="rounded-full p-1 transition-colors hover:bg-muted"
              aria-label={
                isFavorite
                  ? `Remove favorite (${sim.favorite_count} total)`
                  : `Favorite (${sim.favorite_count} total)`
              }
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                }`}
              />
            </button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {sim.favorite_count}
            </span>
          </div>
        </div>
        <CardDescription className="text-xs">by {authorName}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {sim.course_topic}
          </Badge>
          {sim.difficulty && (
            <Badge variant="outline" className="text-xs">
              {difficultyLabel(sim.difficulty)}
            </Badge>
          )}
          {sim.estimated_minutes != null && sim.estimated_minutes > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-transparent bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              ~{sim.estimated_minutes} min
            </span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
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
