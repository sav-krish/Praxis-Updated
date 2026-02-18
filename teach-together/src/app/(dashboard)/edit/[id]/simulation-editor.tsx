"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ArrowRight,
  ChevronDown,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataBlockEditor } from "@/components/simulation/DataBlockEditor";
import type { Simulation, Decision, Option, ReflectionQuestion } from "@/types/database";
import type { SimulationDataBlock, DataBlockType } from "@/types/data-blocks";

interface DecisionWithOptions extends Decision {
  options: Option[];
}

interface SimulationEditorProps {
  simulation: Simulation;
  decisions: DecisionWithOptions[];
  reflectionQuestions: ReflectionQuestion[];
  dataBlocks: SimulationDataBlock[];
}

const EDITOR_STEPS = [
  { id: "background", label: "Background", icon: FileText },
  { id: "decisions", label: "Decisions", icon: CircleDot },
  { id: "reflection", label: "Reflection", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

const DEFAULT_BLOCK_DATA: Record<DataBlockType, Record<string, unknown>> = {
  table: { headers: ["Metric", "Value"], rows: [["—", "—"]] },
  bar_chart: { labels: ["A", "B", "C"], values: [10, 20, 30] },
  line_chart: { xLabel: "Quarter", series: [{ label: "Value", data: [{ x: "Q1", y: 10 }, { x: "Q2", y: 20 }] }] },
  kpi_cards: { items: [{ label: "Metric", value: "—", subtext: "Optional" }] },
  timeline: { events: [{ date: "—", title: "Event", detail: "Detail" }] },
  pie_chart: { labels: ["A", "B", "C"], values: [30, 50, 20] },
};

export function SimulationEditor({ 
  simulation: initialSimulation, 
  decisions: initialDecisions,
  reflectionQuestions: initialQuestions,
  dataBlocks: initialDataBlocks = [],
}: SimulationEditorProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [simulation, setSimulation] = useState(initialSimulation);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [reflectionQuestions, setReflectionQuestions] = useState(initialQuestions);
  const [dataBlocks, setDataBlocks] = useState<SimulationDataBlock[]>(initialDataBlocks);
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);

  const goToStep = (nextIndex: number) => {
    setSlideDirection(nextIndex > currentStep ? 1 : -1);
    setCurrentStep(nextIndex);
  };

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
          difficulty: simulation.difficulty ?? null,
          estimated_minutes: simulation.estimated_minutes ?? null,
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

      // Data blocks: delete removed, update existing, insert new
      const initialIds = new Set(initialDataBlocks.map((b) => b.id));
      for (const id of initialIds) {
        if (!dataBlocks.some((b) => b.id === id)) {
          await supabase.from("simulation_data_blocks").delete().eq("id", id);
        }
      }
      for (let i = 0; i < dataBlocks.length; i++) {
        const b = dataBlocks[i];
        const payload = {
          simulation_id: simulation.id,
          order_num: i + 1,
          block_type: b.block_type,
          title: b.title || null,
          data: b.data as unknown as Record<string, unknown>,
        };
        const isNew = !b.id || b.id.startsWith("new-");
        if (isNew) {
          await supabase.from("simulation_data_blocks").insert(payload);
        } else {
          const { error } = await supabase
            .from("simulation_data_blocks")
            .update(payload)
            .eq("id", b.id);
          if (error) throw error;
        }
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

  const updateDataBlock = (index: number, block: SimulationDataBlock) => {
    setDataBlocks((prev) => {
      const next = [...prev];
      next[index] = block;
      return next;
    });
  };

  const deleteDataBlock = (index: number) => {
    setDataBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const addDataBlock = (type: DataBlockType) => {
    const newBlock: SimulationDataBlock = {
      id: `new-${Date.now()}`,
      simulation_id: simulation.id,
      order_num: dataBlocks.length + 1,
      block_type: type,
      title: null,
      data: DEFAULT_BLOCK_DATA[type] as unknown as SimulationDataBlock["data"],
    };
    setDataBlocks((prev) => [...prev, newBlock]);
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
          <Link href={`/share/${simulation.id}`} className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full min-h-[44px]">
              <Share2 className="mr-2 h-4 w-4 shrink-0" />
              Share
            </Button>
          </Link>
          <Link href={`/session/${simulation.id}/new`} className="flex-1 sm:flex-none">
            <Button className="w-full min-h-[44px]">
              <Play className="mr-2 h-4 w-4 shrink-0" />
              Start Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Step indicator: Background → Decisions → Reflection → Settings */}
      <nav
        className="mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-thin"
        aria-label="Editor steps"
      >
        <div className="flex flex-nowrap items-center justify-center gap-1 sm:gap-2 text-sm min-w-max sm:min-w-0">
          {EDITOR_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === index;
            const isPast = currentStep > index;
            return (
              <span key={step.id} className="flex items-center shrink-0 gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-md px-2 sm:px-3 py-2 transition-colors shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : isPast
                        ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="whitespace-nowrap hidden sm:inline">{step.label}</span>
                </button>
                {index < EDITOR_STEPS.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" aria-hidden />
                )}
              </span>
            );
          })}
        </div>
      </nav>

      {/* Step content with left/right circular nav */}
      <div className="flex gap-3 sm:gap-6 items-stretch justify-center">
        {/* Left nav - circular, sliding animation */}
        <div className="hidden sm:flex shrink-0 w-12 sm:w-16 items-center justify-center min-h-[200px] sm:min-h-[400px]">
          <AnimatePresence mode="wait">
          {currentStep > 0 ? (
            <motion.button
              key="nav-left"
              type="button"
              onClick={() => goToStep(currentStep - 1)}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="sticky top-[calc(50vh-2rem)] h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              title={EDITOR_STEPS[currentStep - 1].label}
              aria-label={`Go to ${EDITOR_STEPS[currentStep - 1].label}`}
            >
              <ArrowLeft className="h-6 w-6 sm:h-7 sm:w-7" />
            </motion.button>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-muted" aria-hidden />
          )}
          </AnimatePresence>
        </div>

        {/* Main content - centered, with slide animation */}
        <div className="flex-1 min-w-0 max-w-3xl mx-auto space-y-6 overflow-hidden">
        <AnimatePresence mode="wait">
        {/* Step 0: Background */}
        {currentStep === 0 && (
          <motion.div
            key="step-0"
            initial={{ x: slideDirection >= 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideDirection >= 0 ? -40 : 40, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="space-y-6"
          >
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
                Supports Markdown (headings, lists, **bold**, and tables). Aim for 1-2 pages.
              </p>
            </CardContent>
          </Card>

          {/* Data blocks: tables, charts, timelines */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Data &amp; Visuals</CardTitle>
              <CardDescription>
                Tables, charts, timelines, and KPI cards shown to students in the background. AI generates these; you can edit or add more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataBlocks.map((block, index) => (
                <DataBlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={(updated) => updateDataBlock(index, updated)}
                  onDelete={() => deleteDataBlock(index)}
                />
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-fit">
                    <Plus className="mr-2 h-4 w-4" />
                    Add data block
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => addDataBlock("table")}>
                    Table
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addDataBlock("bar_chart")}>
                    Bar Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addDataBlock("line_chart")}>
                    Line Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addDataBlock("kpi_cards")}>
                    KPI Cards
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addDataBlock("timeline")}>
                    Timeline
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addDataBlock("pie_chart")}>
                    Pie Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
          </Card>

          {/* Mobile nav - shown when side circles are hidden */}
          <div className="sm:hidden flex justify-end pt-4">
            <Button onClick={() => goToStep(1)} className="min-h-[44px]">
              Decisions
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </div>
          </motion.div>
        )}

        {/* Step 1: Decisions */}
        {currentStep === 1 && (
        <motion.div
          key="step-1"
          initial={{ x: slideDirection >= 0 ? 40 : -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: slideDirection >= 0 ? -40 : 40, opacity: 0 }}
          transition={{ type: "tween", duration: 0.2 }}
          className="space-y-4"
        >
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

          {/* Mobile nav */}
          <div className="sm:hidden flex justify-between pt-4">
            <Button variant="outline" onClick={() => goToStep(0)} className="min-h-[44px]">
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
              Background
            </Button>
            <Button onClick={() => goToStep(2)} className="min-h-[44px]">
              Reflection
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </div>
        </motion.div>
        )}

        {/* Step 2: Reflection */}
        {currentStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ x: slideDirection >= 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideDirection >= 0 ? -40 : 40, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="space-y-6"
          >
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

          {/* Mobile nav */}
          <div className="sm:hidden flex justify-between pt-4">
            <Button variant="outline" onClick={() => goToStep(1)} className="min-h-[44px]">
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
              Decisions
            </Button>
            <Button onClick={() => goToStep(3)} className="min-h-[44px]">
              Settings
              <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
            </Button>
          </div>
          </motion.div>
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ x: slideDirection >= 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideDirection >= 0 ? -40 : 40, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="space-y-6"
          >
          <Card>
            <CardHeader>
              <CardTitle>Run Settings</CardTitle>
              <CardDescription>Configure how students participate in this simulation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Simulation length (for students)</Label>
                <Select
                  value={simulation.difficulty || "hard"}
                  onValueChange={(value: "easy" | "hard" | "challenge") => {
                    const estimates = { easy: 15, hard: 25, challenge: 40 } as const;
                    setSimulation({
                      ...simulation,
                      difficulty: value,
                      estimated_minutes: estimates[value],
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy — ~15 min</SelectItem>
                    <SelectItem value="hard">Hard — ~25 min</SelectItem>
                    <SelectItem value="challenge">Challenge — ~40 min</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Estimated time for a student to complete. Helps set expectations and class timing.
                </p>
              </div>

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

          {/* Mobile nav */}
          <div className="sm:hidden flex justify-between pt-4">
            <Button variant="outline" onClick={() => goToStep(2)} className="min-h-[44px]">
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
              Reflection
            </Button>
          </div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>

        {/* Right nav - circular, sliding animation */}
        <div className="hidden sm:flex shrink-0 w-12 sm:w-16 items-center justify-center min-h-[200px] sm:min-h-[400px]">
          <AnimatePresence mode="wait">
          {currentStep < 3 ? (
            <motion.button
              key="nav-right"
              type="button"
              onClick={() => goToStep(currentStep + 1)}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="sticky top-[calc(50vh-2rem)] h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              title={EDITOR_STEPS[currentStep + 1].label}
              aria-label={`Go to ${EDITOR_STEPS[currentStep + 1].label}`}
            >
              <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
            </motion.button>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-muted" aria-hidden />
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
