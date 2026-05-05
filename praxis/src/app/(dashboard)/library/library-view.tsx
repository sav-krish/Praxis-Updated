"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { FadeIn } from "@/components/landing/fade-in";
import { APP_TILE_BACKGROUNDS } from "@/lib/app-tile-backgrounds";
import { toast } from "sonner";
import { LibrarySimulationCard } from "@/components/simulation/library-simulation-card";
import type { LibrarySimulationRow } from "@/types/library";
import {
  SIMULATION_CARD_GRID_CLASS,
  SIMULATION_CARD_GRID_ITEM_CLASS,
} from "@/lib/simulation-card-layout";

export type { LibrarySimulationRow };

interface LibraryViewProps {
  simulations: LibrarySimulationRow[];
  flagshipSimulations: LibrarySimulationRow[];
  topSimulations: LibrarySimulationRow[];
  userFavoriteIds: string[];
  subjects: string[];
  userId?: string;
  isAdmin?: boolean;
  currentQuery: string;
  currentSubject: string;
  currentDifficulty: string;
}

export function LibraryView({
  simulations,
  flagshipSimulations,
  topSimulations,
  userFavoriteIds: initialFavorites,
  subjects,
  userId,
  isAdmin = false,
  currentQuery,
  currentSubject,
  currentDifficulty,
}: LibraryViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavorites));
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentQuery);

  // Pin the tour anchor to the FIRST simulation that will actually render
  // on the page. Flagship strip first, then community favorites, then the
  // generic results grid. Without this fallback, environments without seeded
  // flagship/top sims would never receive the favorite-button anchor and
  // NextStep would fall back to a centered card with no spotlight.
  const tourAnchorSimId =
    flagshipSimulations[0]?.id ??
    topSimulations[0]?.id ??
    simulations[0]?.id ??
    null;

  const toggleFavorite = async (simulationId: string) => {
    if (!userId) {
      toast.error("Sign in to favorite simulations");
      return;
    }

    setTogglingFavorite(simulationId);
    const supabase = createClient();
    const isFavorited = favorites.has(simulationId);

    if (isFavorited) {
      await supabase
        .from("simulation_favorites")
        .delete()
        .eq("simulation_id", simulationId)
        .eq("user_id", userId);
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(simulationId);
        return next;
      });
    } else {
      await supabase
        .from("simulation_favorites")
        .insert({ simulation_id: simulationId, user_id: userId });
      setFavorites((prev) => new Set(prev).add(simulationId));
    }
    setTogglingFavorite(null);
    router.refresh();
  };

  const updateFilters = (params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value && value !== "all") {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    }
    router.push(`/library?${newParams.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput });
  };

  return (
    <div className="space-y-8">
      <FadeIn>
        <div
          className={`rounded-3xl p-6 sm:p-8 shadow-[var(--shadow-soft)] ring-1 ring-border/60 ${APP_TILE_BACKGROUNDS[2]}`}
        >
          <h1 className="text-2xl sm:text-3xl font-bold">Simulation Library</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Discover community-built simulations, filter by subject, and copy one into your account to edit and run
            in class.
          </p>
        </div>
      </FadeIn>

      {flagshipSimulations.length > 0 && (
        <section>
          <div className="mb-1">
            <h2 className="text-lg font-semibold">Top Picks</h2>
            <p className="text-sm text-muted-foreground">
              Curated simulations highlighted by the Praxis team.
            </p>
          </div>
          <div className={`mt-4 ${SIMULATION_CARD_GRID_CLASS}`}>
            {flagshipSimulations.map((sim) => (
              <div key={sim.id} className={SIMULATION_CARD_GRID_ITEM_CLASS}>
                <LibrarySimulationCard
                  variant="spotlight"
                  sim={sim}
                  isAdmin={isAdmin}
                  isFavorite={favorites.has(sim.id)}
                  favoritePending={togglingFavorite === sim.id}
                  onToggleFavorite={() => toggleFavorite(sim.id)}
                  isTourFavoriteAnchor={sim.id === tourAnchorSimId}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Simulations */}
      {topSimulations.length > 0 && (
        <section>
          <div className="mb-1">
            <h2 className="text-lg font-semibold">Community favorites</h2>
            <p className="text-sm text-muted-foreground">
              Simulations educators save most often.
            </p>
          </div>
          <div className={`mt-4 ${SIMULATION_CARD_GRID_CLASS}`}>
            {topSimulations.map((sim) => (
              <div key={sim.id} className={SIMULATION_CARD_GRID_ITEM_CLASS}>
                <LibrarySimulationCard
                  sim={sim}
                  isAdmin={isAdmin}
                  isFavorite={favorites.has(sim.id)}
                  favoritePending={togglingFavorite === sim.id}
                  onToggleFavorite={() => toggleFavorite(sim.id)}
                  isTourFavoriteAnchor={sim.id === tourAnchorSimId}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search + Filters */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search simulations..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="min-h-[40px]">
              Search
            </Button>
          </form>
          <div className="flex gap-2">
            <Select
              value={currentSubject}
              onValueChange={(v) => updateFilters({ subject: v })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={currentDifficulty}
              onValueChange={(v) => updateFilters({ difficulty: v })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="challenge">Challenge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Results grid */}
      {simulations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {currentQuery || currentSubject !== "all" || currentDifficulty !== "all"
              ? "No simulations match your filters."
              : "No public simulations yet. Be the first to share!"}
          </p>
          {(currentQuery || currentSubject !== "all" || currentDifficulty !== "all") && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/library")}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className={`mt-4 ${SIMULATION_CARD_GRID_CLASS}`}>
          {simulations.map((sim) => (
            <div key={sim.id} className={SIMULATION_CARD_GRID_ITEM_CLASS}>
              <LibrarySimulationCard
                sim={sim}
                isAdmin={isAdmin}
                isFavorite={favorites.has(sim.id)}
                favoritePending={togglingFavorite === sim.id}
                onToggleFavorite={() => toggleFavorite(sim.id)}
                isTourFavoriteAnchor={sim.id === tourAnchorSimId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
