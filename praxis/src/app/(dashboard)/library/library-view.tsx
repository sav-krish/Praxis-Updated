"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Search, Clock, Trophy } from "lucide-react";
import { toast } from "sonner";

interface SimulationCard {
  id: string;
  title: string;
  course_topic: string;
  difficulty: string | null;
  estimated_minutes: number | null;
  favorite_count: number;
  professor_id: string;
  created_at: string;
  professors: { name: string | null } | null;
}

interface LibraryViewProps {
  simulations: SimulationCard[];
  topSimulations: SimulationCard[];
  userFavoriteIds: string[];
  subjects: string[];
  userId?: string;
  currentQuery: string;
  currentSubject: string;
  currentDifficulty: string;
}

export function LibraryView({
  simulations,
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

  const difficultyLabel = (d: string | null) => {
    if (d === "easy") return "Easy";
    if (d === "hard") return "Hard";
    if (d === "challenge") return "Challenge";
    return d;
  };

  const SimCard = ({ sim }: { sim: SimulationCard }) => {
    const isFav = favorites.has(sim.id);
    const authorName = sim.professors?.name || "Anonymous";

    return (
      <Link href={`/edit/${sim.id}`} className="block h-full">
        <Card className="group hover:shadow-md transition-shadow h-full flex flex-col cursor-pointer">
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
                  toggleFavorite(sim.id);
                }}
                disabled={togglingFavorite === sim.id}
                className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
                aria-label={isFav ? "Unfavorite" : "Favorite"}
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"
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
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Simulation Library</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Browse and discover community-shared simulations
        </p>
      </div>

      {/* Top Simulations */}
      {topSimulations.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Top Simulations</h2>
            <span className="text-xs text-muted-foreground">Most favorited by the community</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
            {topSimulations.map((sim) => (
              <div key={sim.id} className="min-w-[220px] max-w-[260px] shrink-0">
                <SimCard sim={sim} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search + Filters */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold">Browse All</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {simulations.map((sim) => (
            <SimCard key={sim.id} sim={sim} />
          ))}
        </div>
      )}
    </div>
  );
}
