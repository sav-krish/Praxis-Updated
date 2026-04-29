"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface DashboardSimulationFiltersProps {
  subjects: string[];
  currentQuery: string;
  currentSubject: string;
  currentDifficulty: string;
}

/**
 * Same layout as Simulation Library search + subject + difficulty filters;
 * updates `/dashboard` query params (library uses `/library`).
 */
export function DashboardSimulationFilters({
  subjects,
  currentQuery,
  currentSubject,
  currentDifficulty,
}: DashboardSimulationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentQuery);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  const updateFilters = (params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value && value !== "all") {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    }
    const qs = newParams.toString();
    router.push(qs ? `/dashboard?${qs}` : "/dashboard");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput });
  };

  return (
    <section className="mb-6 space-y-4">
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
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
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
  );
}
