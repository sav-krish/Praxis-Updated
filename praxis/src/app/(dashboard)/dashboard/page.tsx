import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Edit, Play, BarChart3, BookOpen, FolderOpen, Share2 } from "lucide-react";
import { PreviewSimulationButton } from "@/components/simulation/PreviewSimulationButton";

interface DashboardPageProps {
  searchParams: Promise<{ course?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { course: selectedCourse } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch simulations for this professor
  const { data: allSimulations } = await supabase
    .from("simulations")
    .select("*")
    .eq("professor_id", user.id)
    .order("updated_at", { ascending: false });

  // Unique courses (course_topic) for personalized dashboard
  const courses = Array.from(
    new Set((allSimulations || []).map((s) => s.course_topic || "Uncategorized"))
  ).sort();

  // Filter by selected course when provided
  const simulations = selectedCourse
    ? (allSimulations || []).filter((s) => (s.course_topic || "Uncategorized") === selectedCourse)
    : allSimulations;

  // Check which simulations have completed sessions
  const simulationIds = simulations?.map(s => s.id) || [];
  const { data: completedSessions } = await supabase
    .from("sessions")
    .select("simulation_id")
    .in("simulation_id", simulationIds)
    .eq("status", "complete");

  const simulationsWithReports = new Set(completedSessions?.map(s => s.simulation_id) || []);

  // Running sessions – map simulation_id -> session for "Continue" on cards
  const allSimIds = allSimulations?.map(s => s.id) || [];
  const { data: runningSessions } = allSimIds.length > 0
    ? await supabase
        .from("sessions")
        .select("id, simulation_id")
        .in("simulation_id", allSimIds)
        .eq("status", "running")
        .order("created_at", { ascending: false })
    : { data: [] };

  const sessionBySimulation = (runningSessions || []).reduce<Record<string, { id: string }>>((acc, s) => {
    if (!acc[s.simulation_id]) acc[s.simulation_id] = { id: s.id };
    return acc;
  }, {});

  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "there";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Hello, {displayName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Your simulations · Create and manage classroom exercises
          </p>
        </div>
        <Link href="/create" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto min-h-[48px]">
            <Plus className="mr-2 h-5 w-5 shrink-0" />
            Create New Simulation
          </Button>
        </Link>
      </div>

      {/* Course filter: select a course to see curated simulations */}
      {courses.length > 1 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            By course
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard">
              <Button variant={!selectedCourse ? "default" : "outline"} size="sm" className="min-h-[40px]">
                All
              </Button>
            </Link>
            {courses.map((course) => (
              <Link key={course} href={`/dashboard?course=${encodeURIComponent(course)}`}>
                <Button variant={selectedCourse === course ? "default" : "outline"} size="sm" className="min-h-[40px]">
                  {course}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {simulations && simulations.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {simulations.map((simulation) => {
            const activeSession = sessionBySimulation[simulation.id];
            const isActive = !!activeSession;
            return (
            <Card key={simulation.id} className="group hover:shadow-md transition-shadow">
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
                        <Link href={isActive ? `/session/${simulation.id}/${activeSession.id}` : `/session/${simulation.id}/new`}>
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
                      {simulationsWithReports.has(simulation.id) && (
                        <DropdownMenuItem asChild>
                          <Link href={`/reports/${simulation.id}`}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            View Reports
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-1 text-sm text-muted-foreground">
                  <span>{simulation.mode === "teams" ? "Team Mode" : "Individual Mode"}</span>
                  <span className="text-xs sm:text-sm">Updated {new Date(simulation.updated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/edit/${simulation.id}`} className="flex-1 min-w-0">
                    <Button variant="outline" className="w-full min-h-[44px]" size="sm">
                      <Edit className="mr-2 h-4 w-4 shrink-0" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={isActive ? `/session/${simulation.id}/${activeSession.id}` : `/session/${simulation.id}/new`} className="flex-1 min-w-0">
                    <Button className={`w-full min-h-[44px] ${isActive ? "bg-green-600 hover:bg-green-700 text-white" : ""}`} size="sm">
                      <Play className="mr-2 h-4 w-4 shrink-0" />
                      {isActive ? "Continue" : "Start"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {selectedCourse ? `No simulations for "${selectedCourse}" yet` : "No simulations yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {selectedCourse
                ? "Create a simulation for this course or view all simulations."
                : "Create your first simulation to get started with interactive classroom exercises."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {selectedCourse && (
                <Link href="/dashboard">
                  <Button variant="outline">View all simulations</Button>
                </Link>
              )}
              <Link href="/create">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {selectedCourse ? "Create simulation for this course" : "Create Your First Simulation"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
