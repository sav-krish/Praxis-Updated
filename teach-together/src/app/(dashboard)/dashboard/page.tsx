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
import { Plus, MoreVertical, Edit, Play, BarChart3, BookOpen } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch simulations for this professor
  const { data: simulations } = await supabase
    .from("simulations")
    .select("*")
    .eq("professor_id", user?.id)
    .order("updated_at", { ascending: false });

  // Check which simulations have completed sessions
  const simulationIds = simulations?.map(s => s.id) || [];
  const { data: completedSessions } = await supabase
    .from("sessions")
    .select("simulation_id")
    .in("simulation_id", simulationIds)
    .eq("status", "complete");

  const simulationsWithReports = new Set(completedSessions?.map(s => s.simulation_id) || []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Simulations</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your classroom simulations
          </p>
        </div>
        <Link href="/create">
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create New Simulation
          </Button>
        </Link>
      </div>

      {simulations && simulations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {simulations.map((simulation) => (
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
                        <Link href={`/session/${simulation.id}/new`}>
                          <Play className="mr-2 h-4 w-4" />
                          Start Session
                        </Link>
                      </DropdownMenuItem>
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
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {simulation.mode === "teams" ? "Team Mode" : "Individual Mode"}
                  </span>
                  <span>
                    Updated {new Date(simulation.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/edit/${simulation.id}`} className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/session/${simulation.id}/new`} className="flex-1">
                    <Button className="w-full" size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Start
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No simulations yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first simulation to get started with interactive classroom exercises.
            </p>
            <Link href="/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Simulation
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
