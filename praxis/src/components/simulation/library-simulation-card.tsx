"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { copySimulationToAccount } from "@/app/(dashboard)/share/[id]/actions";
import type { LibrarySimulationRow } from "@/types/library";
import { DeleteLibrarySimulationButton } from "@/components/simulation/delete-library-simulation-button";
import { appTileBackgroundForDifficulty } from "@/lib/app-tile-backgrounds";
import {
  SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS,
  SIMULATION_CARD_HEADER_CLASS,
  SIMULATION_CARD_TILE_SURFACE_CLASS,
  SIMULATION_CARD_TITLE_CLASS,
} from "@/lib/simulation-card-layout";

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
  /** Curated strip: gradient card, no extra badges */
  variant?: "default" | "spotlight";
  isAdmin?: boolean;
  /**
   * When `true`, marks this card's favorite control with `data-tour="favorite-button"`
   * so the onboarding tour can spotlight it. Caller (LibraryView) picks
   * exactly one card per render to wear this anchor.
   */
  isTourFavoriteAnchor?: boolean;
};

const SPOTLIGHT_GRADIENT =
  "linear-gradient(120deg, #fff0e1 0%, #ffe0c4 52%, #ffc795 100%)";

/**
 * @description Public-library card surfacing bookmark (heart), duplicate-to-account controls, curated spotlight variant, tutorial anchor hook (`data-tour`).
 * @param sim — Public library projection (`LibrarySimulationRow`) from Supabase.
 * @param isFavorite — Persisted favorites state backing the heart glyph.
 * @param favoritePending — Disables optimistic heart toggles mid-flight.
 * @param onToggleFavorite — Persist favorite toggle with toast handling.
 * @param variant — `spotlight` uses gradient strip; otherwise default tile visuals.
 * @param isTourFavoriteAnchor — Applies `data-tour="favorite-button"` exactly once across `LibraryView` renders when tutorial needs a target.
 */

export function LibrarySimulationCard({
  sim,
  isFavorite,
  favoritePending,
  onToggleFavorite,
  variant = "default",
  isAdmin = false,
  isTourFavoriteAnchor = false,
}: LibrarySimulationCardProps) {
  const router = useRouter();
  const [usingSim, setUsingSim] = useState(false);
  const authorLine = sim.professors?.name?.trim() ?? null;

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

  const isSpotlight = variant === "spotlight";
  const tile = appTileBackgroundForDifficulty(sim.difficulty);

  return (
    <Card
      className={
        isSpotlight
          ? "praxis-light-surface group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-white/50 bg-transparent! text-ink shadow-md transition-shadow hover:shadow-lg"
          : `${SIMULATION_CARD_TILE_SURFACE_CLASS} ${tile}`
      }
      style={isSpotlight ? { backgroundImage: SPOTLIGHT_GRADIENT } : undefined}
    >
      <CardHeader className={SIMULATION_CARD_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className={`${SIMULATION_CARD_TITLE_CLASS} flex-1 min-w-0`}
          >
            {sim.title}
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            {isAdmin ? (
              <DeleteLibrarySimulationButton
                simulationId={sim.id}
                simulationTitle={sim.title}
              />
            ) : null}
            <button
              type="button"
              data-tour={isTourFavoriteAnchor ? "favorite-button" : undefined}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite();
              }}
              disabled={favoritePending}
              className={
                isSpotlight
                  ? "rounded-full p-1 transition-colors hover:bg-white/40"
                  : "rounded-full p-1 transition-colors hover:bg-white/60"
              }
              aria-label={
                isFavorite
                  ? `Remove favorite (${sim.favorite_count} total)`
                  : `Favorite (${sim.favorite_count} total)`
              }
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  isFavorite
                    ? "fill-red-500 text-red-500"
                    : "text-[#a93d07]"
                }`}
              />
            </button>
            <span className="text-xs tabular-nums text-[#a93d07]">
              {sim.favorite_count}
            </span>
          </div>
        </div>
        {authorLine ? (
          <CardDescription
            className="text-xs text-[#a93d07]"
          >
            by {authorLine}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3 pt-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="secondary"
            className={
              isSpotlight
                ? "border-0 bg-white/75 text-xs text-[#a93d07] backdrop-blur-sm"
                : "border-0 bg-white/70 text-xs font-medium text-[#a93d07] backdrop-blur-sm"
            }
          >
            {sim.course_topic}
          </Badge>
          {sim.difficulty && (
            <Badge
              variant="outline"
              className={
                isSpotlight
                  ? "border-[#a93d07]/30 bg-white/60 text-xs text-[#a93d07] backdrop-blur-sm"
                  : "border-[#a93d07]/25 bg-white/55 text-xs font-medium text-[#a93d07] backdrop-blur-sm"
              }
            >
              {difficultyLabel(sim.difficulty)}
            </Badge>
          )}
          {sim.estimated_minutes != null && sim.estimated_minutes > 0 && (
            <span
              className={
                isSpotlight
                  ? "inline-flex items-center gap-1 rounded-md border border-[#a93d07]/25 bg-white/60 px-2 py-0.5 text-xs text-[#a93d07] backdrop-blur-sm"
                  : "inline-flex items-center gap-1 rounded-md border border-[#a93d07]/25 bg-white/55 px-2 py-0.5 text-xs font-medium text-[#a93d07] backdrop-blur-sm"
              }
            >
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              ~{sim.estimated_minutes} min
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            className={`flex-1 ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} border border-[#a93d07]/50 bg-[#fffaf4] text-[#a93d07] shadow-sm hover:bg-[#ffe6d3] hover:text-[#7d2d05]`}
            size="sm"
            onClick={handleUseSimulation}
            disabled={usingSim}
          >
            {usingSim ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
            ) : null}
            {usingSim ? "Adding…" : "Use simulation"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className={
              isSpotlight
                ? `flex-1 ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} border-[#a93d07]/60 bg-white/85 text-[#a93d07] hover:bg-[#ffe6d3] hover:text-[#7d2d05]`
                : `flex-1 ${SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS} border-[#a93d07]/50 bg-white/80 text-[#a93d07] backdrop-blur-sm hover:bg-[#ffe6d3] hover:text-[#7d2d05]`
            }
          >
            <Link href={`/edit/${sim.id}`}>
              View details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
