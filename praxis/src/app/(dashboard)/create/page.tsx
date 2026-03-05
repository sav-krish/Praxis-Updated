"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, Loader2, Sparkles, FileText, X, Wand2, PenLine } from "lucide-react";
import { toast } from "sonner";

const PREFERENCE_CATEGORIES = {
  style: {
    label: "Simulation Style",
    options: ["Case Study", "Role Play", "Crisis Management", "Negotiation", "Ethical Dilemma", "Strategic Planning"],
  },
  interaction: {
    label: "Student Interaction",
    options: ["Individual Reflection", "Group Discussion", "Debate", "Peer Review"],
  },
  focus: {
    label: "Content Focus",
    options: ["Data-Driven", "Narrative-Heavy", "Visual/Charts", "Timeline-Based"],
  },
  assessment: {
    label: "Assessment Style",
    options: ["Clear Right/Wrong", "Nuanced Tradeoffs", "No Correct Answer"],
  },
} as const;

const COURSE_TOPICS = [
  "Power & Influence",
  "Change Management",
  "Leadership",
  "Organizational Behavior",
  "Strategic Management",
  "Business Ethics",
  "Negotiation",
  "Team Dynamics",
  "Other",
];

interface GeneratedDataBlock {
  block_type: string;
  title: string;
  data: Record<string, unknown>;
}

interface GeneratedSimulation {
  title: string;
  backgroundContent: string;
  dataBlocks?: GeneratedDataBlock[];
  decisions: {
    prompt: string;
    options: {
      label: "A" | "B" | "C";
      title: string;
      description: string;
      consequence: string;
      score: number;
    }[];
  }[];
  reflectionQuestions: string[];
}

export default function CreateSimulationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    courseTopic: "Power & Influence",
    difficulty: "hard" as "easy" | "hard" | "challenge",
    goal: "",
    targetDecisions: "",
    pastedText: "",
    aiNotes: "",
    reframeAs: "",
  });
  const [preferences, setPreferences] = useState<Record<string, string[]>>({
    style: [],
    interaction: [],
    focus: [],
    assessment: [],
  });

  const togglePreference = (category: string, option: string) => {
    setPreferences((prev) => {
      const current = prev[category] || [];
      return {
        ...prev,
        [category]: current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option],
      };
    });
  };

  const hasAnyPreferences = Object.values(preferences).some((v) => v.length > 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Save generated content to database
  const saveGeneratedSimulation = async (
    generated: GeneratedSimulation,
    uploadedFilePaths?: { path: string; originalName: string }[]
  ) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in");
    }

    // Ensure professor row exists (trigger might not have run)
    const { data: professor } = await supabase
      .from("professors")
      .select("id")
      .eq("id", user.id)
      .single();
    if (!professor) {
      const { error: profError } = await supabase.from("professors").insert({
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.name as string) ?? null,
      });
      if (profError) {
        throw new Error(profError.message || "Could not create professor profile");
      }
    }

    const bgContent = (generated as { backgroundContent?: string; background_content?: string }).backgroundContent
      ?? (generated as { background_content?: string }).background_content
      ?? "";

    // Create the simulation
    const difficultyEstimates = { easy: 15, hard: 25, challenge: 40 } as const;
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .insert({
        professor_id: user.id,
        title: (generated.title || formData.title) || "Untitled Simulation",
        course_topic: formData.courseTopic || "Power & Influence",
        difficulty: formData.difficulty || "hard",
        estimated_minutes: difficultyEstimates[formData.difficulty] ?? 25,
        goal: formData.goal || null,
        target_decisions: formData.targetDecisions || null,
        background_content: bgContent,
        ai_notes: formData.aiNotes || null,
        status: "draft",
      })
      .select()
      .single();

    if (simError) throw new Error(simError.message || "Could not create simulation");

    // Link uploaded files to simulation
    if (uploadedFilePaths?.length) {
      for (const { path, originalName } of uploadedFilePaths) {
        const { error: fileError } = await supabase
          .from("simulation_uploaded_files")
          .insert({
            simulation_id: simulation.id,
            storage_path: path,
            original_name: originalName,
          });
        if (fileError) console.warn("Could not link uploaded file:", fileError);
      }
    }

    const decisions = Array.isArray(generated.decisions) ? generated.decisions : [];
    if (decisions.length === 0) throw new Error("Generated simulation has no decisions");

    // Create decisions with AI-generated content
    for (let i = 0; i < decisions.length; i++) {
      const genDecision = decisions[i];
      const { data: decision, error: decError } = await supabase
        .from("decisions")
        .insert({
          simulation_id: simulation.id,
          order_num: i + 1,
          prompt: genDecision.prompt,
        })
        .select()
        .single();

      if (decError) throw new Error(decError.message || "Could not save decisions");

      const options = Array.isArray(genDecision.options) ? genDecision.options : [];
      for (const option of options) {
        const { error: optError } = await supabase
          .from("options")
          .insert({
            decision_id: decision.id,
            label: option.label,
            title: option.title,
            description: option.description ?? null,
            consequence: option.consequence ?? null,
            score: option.score,
          });

        if (optError) throw new Error(optError.message || "Could not save options");
      }
    }

    // Create reflection questions
    const questions = generated.reflectionQuestions?.length > 0
      ? generated.reflectionQuestions
      : ["What were your key takeaways from this simulation?", "What did you learn that you can apply in real situations?"];

    for (let i = 0; i < Math.min(questions.length, 2); i++) {
      const { error: refError } = await supabase
        .from("reflection_questions")
        .insert({
          simulation_id: simulation.id,
          order_num: i + 1,
          question: questions[i],
        });

      if (refError) throw new Error(refError.message || "Could not save reflection questions");
    }

    // Create data blocks (tables, charts, timelines, etc.)
    const dataBlocks = Array.isArray(generated.dataBlocks) ? generated.dataBlocks : [];
    const validTypes = ["table", "bar_chart", "line_chart", "kpi_cards", "timeline", "pie_chart"];
    for (let i = 0; i < dataBlocks.length; i++) {
      const block = dataBlocks[i];
      if (!block || !validTypes.includes(block.block_type) || !block.data) continue;
      const { error: blockError } = await supabase
        .from("simulation_data_blocks")
        .insert({
          simulation_id: simulation.id,
          order_num: i + 1,
          block_type: block.block_type,
          title: block.title || null,
          data: block.data as unknown as Json,
        });
      if (blockError) console.warn("Could not save data block:", blockError);
    }

    return simulation.id;
  };

  // Generate with AI
  const handleGenerateWithAI = async () => {
    if (!formData.title) {
      toast.error("Please enter a title first");
      return;
    }

    setGeneratingAI(true);
    toast.info("Generating simulation with AI... This may take 30-60 seconds.");

    try {
      const formPayload = new FormData();
      formPayload.append("title", formData.title);
      formPayload.append("courseTopic", formData.courseTopic);
      formPayload.append("difficulty", formData.difficulty);
      formPayload.append("goal", formData.goal);
      formPayload.append("targetDecisions", formData.targetDecisions);
      formPayload.append("pastedText", formData.pastedText);
      formPayload.append("aiNotes", formData.aiNotes);
      formPayload.append("reframeAs", formData.reframeAs);
      if (hasAnyPreferences) {
        formPayload.append("preferences", JSON.stringify(preferences));
      }
      
      for (const file of files) {
        formPayload.append("files", file);
      }

      const response = await fetch("/api/generate-simulation", {
        method: "POST",
        body: formPayload,
      });

      let data: {
        success?: boolean;
        error?: string;
        simulation?: unknown;
        uploadedFilePaths?: { path: string; originalName: string }[];
      };
      try {
        data = await response.json();
      } catch {
        throw new Error(response.ok ? "Invalid response from server" : `Request failed (${response.status})`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data?.error || `Request failed (${response.status})`);
      }
      if (!data.simulation) {
        throw new Error("No simulation data returned");
      }

      toast.info("Saving simulation…");
      const simulationId = await saveGeneratedSimulation(
        data.simulation as GeneratedSimulation,
        data.uploadedFilePaths
      );

      toast.success("Simulation generated! Review and edit the content.");
      router.push(`/edit/${simulationId}?generated=1`);
    } catch (error) {
      console.error("Create simulation error:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof (error as { message?: string })?.message === "string"
            ? (error as { message: string }).message
            : "Failed to generate simulation";
      toast.error(message);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Create manually (blank template)
  const handleCreateManually = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Ensure professor row exists (trigger might not have run)
      const { data: professor } = await supabase
        .from("professors")
        .select("id")
        .eq("id", user.id)
        .single();
      if (!professor) {
        const { error: profError } = await supabase.from("professors").insert({
          id: user.id,
          email: user.email ?? "",
          name: (user.user_metadata?.name as string) ?? null,
        });
        if (profError) {
          throw new Error(profError.message || "Could not create professor profile");
        }
      }

      const difficultyEstimates = { easy: 15, hard: 25, challenge: 40 } as const;
      const { data: simulation, error: simError } = await supabase
        .from("simulations")
        .insert({
          professor_id: user.id,
          title: formData.title,
          course_topic: formData.courseTopic,
          difficulty: formData.difficulty || "hard",
          estimated_minutes: difficultyEstimates[formData.difficulty] ?? 25,
          goal: formData.goal,
          target_decisions: formData.targetDecisions,
          ai_notes: formData.aiNotes,
          status: "draft",
        })
        .select()
        .single();

      if (simError) throw new Error(simError.message || "Could not create simulation");

      // Create default decisions (3 empty decisions)
      for (let i = 1; i <= 3; i++) {
        const { data: decision, error: decError } = await supabase
          .from("decisions")
          .insert({
            simulation_id: simulation.id,
            order_num: i,
            prompt: `Decision ${i}: [Edit this prompt]`,
          })
          .select()
          .single();

        if (decError) throw new Error(decError.message || "Could not create decision");

        // Create 3 options for each decision
        const labels = ["A", "B", "C"] as const;
        for (const label of labels) {
          const { error: optError } = await supabase
            .from("options")
            .insert({
              decision_id: decision.id,
              label,
              title: `Option ${label}`,
              description: "",
              consequence: "",
              score: label === "A" ? 3 : label === "B" ? 2 : 1,
            });

          if (optError) throw new Error(optError.message || "Could not create option");
        }
      }

      // Create default reflection questions
      const reflectionQuestions = [
        "What were your key takeaways from this simulation?",
        "What did you learn that you can apply in real situations?",
      ];

      for (let i = 0; i < reflectionQuestions.length; i++) {
        const { error: refError } = await supabase
          .from("reflection_questions")
          .insert({
            simulation_id: simulation.id,
            order_num: i + 1,
            question: reflectionQuestions[i],
          });

        if (refError) throw new Error(refError.message || "Could not create reflection question");
      }

      toast.success("Simulation created! Now let's edit the details.");
      router.push(`/edit/${simulation.id}`);
    } catch (error) {
      console.error("Create simulation error:", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof (error as { message?: string })?.message === "string"
            ? (error as { message: string }).message
            : "Failed to create simulation";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-0 sm:px-4">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Simulation</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Set up your simulation intent and upload any supporting materials
        </p>
      </div>

      <form onSubmit={handleCreateManually}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Give your simulation a title and categorize it</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Simulation Title *</Label>
              <Input
                id="title"
                placeholder="e.g., The Leadership Crisis at Acme Corp"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Course / Topic</Label>
              <Select
                value={formData.courseTopic}
                onValueChange={(value) => setFormData({ ...formData, courseTopic: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_TOPICS.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty / Length</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value: "easy" | "hard" | "challenge") => setFormData({ ...formData, difficulty: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy — ~15 min (shorter scenario, simpler decisions)</SelectItem>
                  <SelectItem value="hard">Hard — ~25 min (moderate complexity)</SelectItem>
                  <SelectItem value="challenge">Challenge — ~40 min (longer, more nuanced)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                AI will tailor the scenario length and decision complexity to this level
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Simulation Intent</CardTitle>
            <CardDescription>Define what you want students to learn and experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Goal of the Simulation</Label>
              <Textarea
                id="goal"
                placeholder="What should students understand or struggle with by the end?"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Example: Students should understand the tension between formal and informal power in organizations
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="decisions">Decisions You Want Students to Make</Label>
              <Textarea
                id="decisions"
                placeholder="What types of tradeoffs or decisions are you hoping students debate?"
                value={formData.targetDecisions}
                onChange={(e) => setFormData({ ...formData, targetDecisions: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Example: Whether to work through formal channels or build coalitions, how to handle resistance
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Select tags to guide the AI in generating your simulation (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(PREFERENCE_CATEGORIES).map(([key, category]) => (
              <div key={key} className="space-y-2">
                <Label className="text-sm font-medium">{category.label}</Label>
                <div className="flex flex-wrap gap-2">
                  {category.options.map((option) => {
                    const isSelected = preferences[key]?.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => togglePreference(key, option)}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Materials</CardTitle>
            <CardDescription>
              Upload case studies, readings, or other materials to help generate content (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt"
                multiple
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload files</p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, or TXT files
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="pastedText">Or Paste Text Directly</Label>
              <Textarea
                id="pastedText"
                placeholder="Paste any text content here..."
                value={formData.pastedText}
                onChange={(e) => setFormData({ ...formData, pastedText: e.target.value })}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Grounding Notes
            </CardTitle>
            <CardDescription>
              Optional guidance for AI content generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="e.g., Align with Kotter's change model, Emphasize informal power, Avoid finance-heavy framing"
              value={formData.aiNotes}
              onChange={(e) => setFormData({ ...formData, aiNotes: e.target.value })}
              rows={3}
            />

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="reframe">Reframe / Disguise Scenario As</Label>
              <Input
                id="reframe"
                placeholder='e.g., "A racing team deciding on tire changes" instead of the original setting'
                value={formData.reframeAs}
                onChange={(e) => setFormData({ ...formData, reframeAs: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                The AI will camouflage the case using this alternate setting while preserving the core dilemmas
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button 
              type="button" 
              className="flex-1 min-h-[48px] w-full" 
              size="lg"
              onClick={handleGenerateWithAI}
              disabled={loading || generatingAI || !formData.title}
            >
              {generatingAI ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin shrink-0" />
              ) : (
                <Wand2 className="mr-2 h-5 w-5 shrink-0" />
              )}
              {generatingAI ? "Generating..." : "Generate with AI"}
            </Button>
            <Button 
              type="submit" 
              variant="outline"
              className="flex-1 min-h-[48px] w-full" 
              size="lg"
              disabled={loading || generatingAI || !formData.title}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin shrink-0" />
              ) : (
                <PenLine className="mr-2 h-5 w-5 shrink-0" />
              )}
              Create Manually
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            <strong>Generate with AI</strong> uses your uploaded materials and goals to create a complete simulation. <br />
            <strong>Create Manually</strong> gives you a blank template to fill in yourself.
          </p>
          <Button type="button" variant="ghost" onClick={() => router.back()} className="self-center">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
