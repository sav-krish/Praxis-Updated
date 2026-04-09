"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { LibrarySimulationCard } from "@/components/simulation/library-simulation-card";
import type { LibrarySimulationRow } from "@/types/library";

export type { LibrarySimulationRow };

/** As many ~320px columns as fit per row (wraps); tracks shrink only below 320px when the row is narrower than 320px. */
const LIBRARY_SIM_GRID =
  "mt-4 grid w-full gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),320px))] [justify-content:start]";

interface LibraryViewProps {
  simulations: LibrarySimulationRow[];
  flagshipSimulations: LibrarySimulationRow[];
  topSimulations: LibrarySimulationRow[];
  userFavoriteIds: string[];
  subjects: string[];
  userId?: string;
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
  currentQuery,
  currentSubject,
  currentDifficulty,
}: LibraryViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavorites));
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentQuery);

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Simulation Library</h1>
      </div>

      {flagshipSimulations.length > 0 && (
        <section>
          <div className="mb-1">
            <h2 className="text-lg font-semibold">Top Picks</h2>
            <p className="text-sm text-muted-foreground">
              Curated simulations highlighted by the Praxis team.
            </p>
          </div>
          <div className={LIBRARY_SIM_GRID}>
            {flagshipSimulations.map((sim) => (
              <div key={sim.id} className="min-w-0 w-full">
                <LibrarySimulationCard
                  variant="spotlight"
                  sim={sim}
                  isFavorite={favorites.has(sim.id)}
                  favoritePending={togglingFavorite === sim.id}
                  onToggleFavorite={() => toggleFavorite(sim.id)}
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
          <div className={LIBRARY_SIM_GRID}>
            {topSimulations.map((sim) => (
              <div key={sim.id} className="min-w-0 w-full">
                <LibrarySimulationCard
                  sim={sim}
                  isFavorite={favorites.has(sim.id)}
                  favoritePending={togglingFavorite === sim.id}
                  onToggleFavorite={() => toggleFavorite(sim.id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search + Filters */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold">Browse and discover community-shared simulations</h2>
        </div>
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
        <div className={LIBRARY_SIM_GRID}>
          {simulations.map((sim) => (
            <div key={sim.id} className="min-w-0 w-full">
              <LibrarySimulationCard
                sim={sim}
                isFavorite={favorites.has(sim.id)}
                favoritePending={togglingFavorite === sim.id}
                onToggleFavorite={() => toggleFavorite(sim.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
