"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Save, 
  Loader2, 
  Play, 
  Settings,
  FileText,
  CircleDot,
  MessageSquare,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type { Simulation, Decision, Option, ReflectionQuestion } from "@/types/database";

interface DecisionWithOptions extends Decision {
  options: Option[];
}

interface SimulationEditorProps {
  simulation: Simulation;
  decisions: DecisionWithOptions[];
  reflectionQuestions: ReflectionQuestion[];
}

export function SimulationEditor({ 
  simulation: initialSimulation, 
  decisions: initialDecisions,
  reflectionQuestions: initialQuestions 
}: SimulationEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [simulation, setSimulation] = useState(initialSimulation);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [reflectionQuestions, setReflectionQuestions] = useState(initialQuestions);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    try {
      // Update simulation
      const { error: simError } = await supabase
        .from("simulations")
        .update({
          title: simulation.title,
          course_topic: simulation.course_topic,
          goal: simulation.goal,
          target_decisions: simulation.target_decisions,
          background_content: simulation.background_content,
          mode: simulation.mode,
          team_size: simulation.team_size,
          team_assignment: simulation.team_assignment,
          updated_at: new Date().toISOString(),
        })
        .eq("id", simulation.id);

      if (simError) throw simError;

      // Update decisions and options
      for (const decision of decisions) {
        const { error: decError } = await supabase
          .from("decisions")
          .update({ prompt: decision.prompt })
          .eq("id", decision.id);

        if (decError) throw decError;

        for (const option of decision.options) {
          const { error: optError } = await supabase
            .from("options")
            .update({
              title: option.title,
              description: option.description,
              consequence: option.consequence,
              score: option.score,
            })
            .eq("id", option.id);

          if (optError) throw optError;
        }
      }

      // Update reflection questions
      for (const question of reflectionQuestions) {
        const { error: refError } = await supabase
          .from("reflection_questions")
          .update({ question: question.question })
          .eq("id", question.id);

        if (refError) throw refError;
      }

      toast.success("Simulation saved!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save simulation");
    } finally {
      setSaving(false);
    }
  };

  const updateDecision = (index: number, field: string, value: string) => {
    setDecisions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOption = (decisionIndex: number, optionIndex: number, field: string, value: string | number) => {
    setDecisions(prev => {
      const updated = [...prev];
      const options = [...updated[decisionIndex].options];
      options[optionIndex] = { ...options[optionIndex], [field]: value };
      updated[decisionIndex] = { ...updated[decisionIndex], options };
      return updated;
    });
  };

  const updateReflectionQuestion = (index: number, value: string) => {
    setReflectionQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], question: value };
      return updated;
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Edit Simulation</h1>
            <p className="text-muted-foreground text-sm truncate">{simulation.title}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSave} disabled={saving} className="min-h-[44px] flex-1 sm:flex-none">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
          <Link href={`/session/${simulation.id}/new`} className="flex-1 sm:flex-none">
            <Button className="w-full min-h-[44px]">
              <Play className="mr-2 h-4 w-4 shrink-0" />
              Start Session
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="background" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="background" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm py-2">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            Background
          </TabsTrigger>
          <TabsTrigger value="decisions" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm py-2">
            <CircleDot className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            Decisions
          </TabsTrigger>
          <TabsTrigger value="reflection" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm py-2">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            Reflection
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm py-2">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Background Tab */}
        <TabsContent value="background">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Intent</CardTitle>
              <CardDescription>The learning objectives for this simulation (read-only reference)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div>
                  <span className="text-sm font-medium">Goal:</span>
                  <p className="text-sm text-muted-foreground">{simulation.goal || "Not specified"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Target Decisions:</span>
                  <p className="text-sm text-muted-foreground">{simulation.target_decisions || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Background Content</CardTitle>
              <CardDescription>
                The scenario and context students will read before making decisions (1-2 pages)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write the background scenario here. This is what students will read to understand the context before making decisions..."
                value={simulation.background_content || ""}
                onChange={(e) => setSimulation({ ...simulation, background_content: e.target.value })}
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supports basic text formatting. Aim for 1-2 pages of content.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Decisions Tab */}
        <TabsContent value="decisions" className="space-y-4">
          {decisions.map((decision, dIndex) => (
            <Collapsible key={decision.id} defaultOpen={false} className="group/decision">
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full text-left px-6 py-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Decision {decision.order_num}</Badge>
                      <span className="text-sm text-muted-foreground truncate max-w-md">
                        {decision.prompt || "No prompt yet"}
                      </span>
                    </div>
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/decision:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6 border-t pt-6">
                    <div className="space-y-2">
                      <Label>Decision Prompt</Label>
                      <Textarea
                        placeholder="What decision does the student need to make?"
                        value={decision.prompt}
                        onChange={(e) => updateDecision(dIndex, "prompt", e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label>Options</Label>
                      {decision.options.map((option, oIndex) => (
                        <div key={option.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <Badge>{option.label}</Badge>
                            <Input
                              placeholder="Option title"
                              value={option.title}
                              onChange={(e) => updateOption(dIndex, oIndex, "title", e.target.value)}
                              className="flex-1"
                            />
                            <div className="flex items-center gap-2">
                              <Label className="text-sm whitespace-nowrap">Score:</Label>
                              <Select
                                value={String(option.score)}
                                onValueChange={(value) => updateOption(dIndex, oIndex, "score", parseInt(value))}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1</SelectItem>
                                  <SelectItem value="2">2</SelectItem>
                                  <SelectItem value="3">3</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Description</Label>
                            <Textarea
                              placeholder="Describe this option..."
                              value={option.description || ""}
                              onChange={(e) => updateOption(dIndex, oIndex, "description", e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Consequence</Label>
                            <Textarea
                              placeholder="What happens when this option is chosen?"
                              value={option.consequence || ""}
                              onChange={(e) => updateOption(dIndex, oIndex, "consequence", e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </TabsContent>

        {/* Reflection Tab */}
        <TabsContent value="reflection">
          <Card>
            <CardHeader>
              <CardTitle>Reflection Questions</CardTitle>
              <CardDescription>
                Questions students will answer after completing all decisions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reflectionQuestions.map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <Label>Question {index + 1}</Label>
                  <Input
                    value={question.question}
                    onChange={(e) => updateReflectionQuestion(index, e.target.value)}
                    placeholder="Enter reflection question..."
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Run Settings</CardTitle>
              <CardDescription>Configure how students participate in this simulation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Participation Mode</Label>
                <Select
                  value={simulation.mode}
                  onValueChange={(value: "individual" | "teams") => 
                    setSimulation({ ...simulation, mode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual - Each student submits their own responses</SelectItem>
                    <SelectItem value="teams">Teams - Students work in groups, one submission per team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {simulation.mode === "teams" && (
                <>
                  <div className="space-y-2">
                    <Label>Team Assignment</Label>
                    <Select
                      value={simulation.team_assignment || "auto"}
                      onValueChange={(value: "auto" | "self") => 
                        setSimulation({ ...simulation, team_assignment: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-assign - System assigns students to teams</SelectItem>
                        <SelectItem value="self">Self-organize - Students choose or create teams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Team Size</Label>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      value={simulation.team_size || 4}
                      onChange={(e) => 
                        setSimulation({ ...simulation, team_size: parseInt(e.target.value) })
                      }
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of students per team (for auto-assign)
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">
                      <strong>Note:</strong> In team mode, only one designated voter per team can submit responses.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Save Bar */}
      <div className="sticky bottom-0 bg-background border-t py-4 mt-6 sm:mt-8 -mx-3 sm:-mx-4 px-3 sm:px-4 safe-area-inset-bottom">
        <div className="max-w-5xl mx-auto flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving} className="min-h-[48px] w-full sm:w-auto">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
          <Link href={`/session/${simulation.id}/new`} className="w-full sm:w-auto">
            <Button className="w-full min-h-[48px]">
              <Play className="mr-2 h-4 w-4 shrink-0" />
              Start Live Session
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
