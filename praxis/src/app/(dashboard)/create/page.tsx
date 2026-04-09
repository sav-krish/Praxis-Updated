"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Upload, Loader2, Sparkles, FileText, X, Wand2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { PrivacyNotice } from "@/components/ui/privacy-notice";
import { SubjectSelector } from "@/components/ui/subject-selector";
import { FieldInfoHint } from "@/components/ui/field-info-hint";
import type { GeneratedSimulation } from "@/lib/openai";

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

const DIFFICULTY_LENGTH_OPTIONS = [
  { value: "easy" as const, label: "Easy", time: "~15 min" },
  { value: "hard" as const, label: "Hard", time: "~25 min" },
  { value: "challenge" as const, label: "Challenge", time: "~40 min" },
] as const;

export default function CreateSimulationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    courseTopic: "",
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
  const [hiddenProfilesEnabled, setHiddenProfilesEnabled] = useState(false);

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

    const bgContent = generated.backgroundContent ?? "";

    // Create the simulation
    const difficultyEstimates = { easy: 15, hard: 25, challenge: 40 } as const;
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .insert({
        professor_id: user.id,
        title: (generated.title || formData.title) || "Untitled Simulation",
        course_topic: formData.courseTopic || "General",
        difficulty: formData.difficulty || "hard",
        estimated_minutes: difficultyEstimates[formData.difficulty] ?? 25,
        goal: formData.goal || null,
        target_decisions: formData.targetDecisions || null,
        background_content: bgContent,
        ai_notes: formData.aiNotes || null,
        status: "draft",
        hidden_profiles_enabled: hiddenProfilesEnabled,
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

    // Auto-save sources from uploaded files and pasted text
    const fileSources: { simulation_id: string; label: string; source_type: "file" | "text" }[] = [];
    if (uploadedFilePaths?.length) {
      for (const { originalName } of uploadedFilePaths) {
        fileSources.push({
          simulation_id: simulation.id,
          label: originalName,
          source_type: "file" as const,
        });
      }
    }
    if (formData.pastedText?.trim()) {
      fileSources.push({
        simulation_id: simulation.id,
        label: "Pasted course material",
        source_type: "text" as const,
      });
    }
    if (fileSources.length > 0) {
      await supabase.from("simulation_sources").insert(fileSources);
    }

    if (hiddenProfilesEnabled) {
      const hp = Array.isArray(generated.hiddenProfiles) ? generated.hiddenProfiles : [];
      const roles =
        hp.length > 0
          ? hp.filter((p) => p?.profile_name?.trim() && p?.private_briefing != null).slice(0, 6)
          : [];
      const toInsert =
        roles.length > 0
          ? roles
          : [
              { profile_name: "Role 1", private_briefing: "Edit this briefing in Run Settings." },
              { profile_name: "Role 2", private_briefing: "Edit this briefing in Run Settings." },
            ];
      for (let i = 0; i < toInsert.length; i++) {
        const p = toInsert[i];
        await supabase.from("simulation_profiles").insert({
          simulation_id: simulation.id,
          profile_name: p.profile_name,
          private_briefing: p.private_briefing,
          order_num: i + 1,
        });
      }
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
      formPayload.append("hiddenProfilesEnabled", hiddenProfilesEnabled ? "true" : "false");

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
          hidden_profiles_enabled: hiddenProfilesEnabled,
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

      if (hiddenProfilesEnabled) {
        const placeholders = [
          { profile_name: "Role 1", private_briefing: "Edit this private briefing in Run Settings." },
          { profile_name: "Role 2", private_briefing: "Edit this private briefing in Run Settings." },
        ];
        for (let i = 0; i < placeholders.length; i++) {
          const { error: profErr } = await supabase.from("simulation_profiles").insert({
            simulation_id: simulation.id,
            profile_name: placeholders[i].profile_name,
            private_briefing: placeholders[i].private_briefing,
            order_num: i + 1,
          });
          if (profErr) throw new Error(profErr.message || "Could not create hidden roles");
        }
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

      </div>

      <form onSubmit={handleCreateManually}>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex-1">Basic Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Simulation Title</Label>
              <Input
                id="title"
                placeholder="e.g., The Leadership Crisis at Acme Corp"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <SubjectSelector
              value={formData.courseTopic}
              onChange={(value) => setFormData({ ...formData, courseTopic: value })}
            />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label id="difficulty-length-label">Difficulty / Length</Label>
              </div>
              <div
                role="radiogroup"
                aria-labelledby="difficulty-length-label"
                className="flex flex-wrap gap-2"
              >
                {DIFFICULTY_LENGTH_OPTIONS.map((opt) => {
                  const selected = formData.difficulty === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        setFormData({ ...formData, difficulty: opt.value })
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-transparent bg-muted text-muted-foreground hover:border-border hover:text-foreground"
                      )}
                    >
                      <span>{opt.label}</span>
                      <span className="tabular-nums opacity-90">{opt.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex-1">Upload Materials</CardTitle>
  
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 py-2">
              <button
                type="button"
                id="hidden-roles-toggle"
                role="switch"
                aria-checked={hiddenProfilesEnabled}
                onClick={() => setHiddenProfilesEnabled((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  hiddenProfilesEnabled ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition ${
                    hiddenProfilesEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <Label htmlFor="hidden-roles-toggle" className="text-sm cursor-pointer">
                Hidden roles
              </Label>
              <FieldInfoHint>
                AI generates distinct private briefings. Edit roles after generation.
              </FieldInfoHint>
            </div>

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

            <PrivacyNotice />

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
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex-1">Simulation Intent</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="goal">Goal of the Simulation</Label>
              </div>
              <Textarea
                id="goal"
                placeholder="What should students understand or struggle with by the end?"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="decisions">Decisions You Want Students to Make</Label>
              </div>
              <Textarea
                id="decisions"
                placeholder="What types of tradeoffs or decisions are you hoping students debate?"
                value={formData.targetDecisions}
                onChange={(e) => setFormData({ ...formData, targetDecisions: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex-1">Preferences</CardTitle>
              <FieldInfoHint className="shrink-0">
                Select tags to guide the AI in generating your simulation (optional)
              </FieldInfoHint>
            </div>
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
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex flex-1 items-center gap-2 min-w-0">
                <Sparkles className="h-5 w-5 shrink-0" />
                <span>AI Grounding Notes</span>
              </CardTitle>
            </div>
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
              <div className="flex items-center gap-1.5">
                <Label htmlFor="reframe">Reframe / Disguise Scenario As</Label>
                <FieldInfoHint>
                  The AI will camouflage the case using this alternate setting while preserving the core dilemmas
                </FieldInfoHint>
              </div>
              <Input
                id="reframe"
                placeholder='e.g., "A racing team deciding on tire changes" instead of the original setting'
                value={formData.reframeAs}
                onChange={(e) => setFormData({ ...formData, reframeAs: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="@container w-full min-w-0">
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 @min-[36rem]:grid-cols-2 @min-[36rem]:gap-1.5 @min-[48rem]:gap-2.5">
              <Button
                type="button"
                variant="aiGradient"
                size="sm"
                onClick={handleGenerateWithAI}
                disabled={loading || generatingAI || !formData.title}
                className="h-auto min-h-[44px] w-full min-w-0 max-w-full shrink justify-center px-3 py-2.5 text-sm font-semibold leading-none @min-[36rem]:min-h-[38px] @min-[36rem]:px-1.5 @min-[36rem]:py-2 @min-[36rem]:text-[10px] @min-[36rem]:font-semibold @min-[42rem]:text-[11px] @min-[48rem]:min-h-[44px] @min-[48rem]:px-2.5 @min-[48rem]:text-xs @min-[56rem]:text-sm"
              >
                <span className="relative z-1 inline-flex max-w-full min-w-0 items-center justify-center gap-1 @min-[36rem]:gap-0.5 @min-[48rem]:gap-1.5">
                  {generatingAI ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin @min-[36rem]:h-3 @min-[36rem]:w-3 @min-[48rem]:h-4 @min-[48rem]:w-4" />
                  ) : (
                    <Wand2 className="h-4 w-4 shrink-0 @min-[36rem]:h-3 @min-[36rem]:w-3 @min-[48rem]:h-4 @min-[48rem]:w-4" />
                  )}
                  <span className="whitespace-nowrap">
                    {generatingAI ? "Generating..." : "Generate with AI"}
                  </span>
                </span>
              </Button>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-auto min-h-[44px] w-full min-w-0 max-w-full shrink justify-center px-3 py-2.5 text-sm font-semibold leading-none @min-[36rem]:min-h-[38px] @min-[36rem]:px-1.5 @min-[36rem]:py-2 @min-[36rem]:text-[10px] @min-[36rem]:font-semibold @min-[42rem]:text-[11px] @min-[48rem]:min-h-[44px] @min-[48rem]:px-2.5 @min-[48rem]:text-xs @min-[56rem]:text-sm"
                disabled={loading || generatingAI || !formData.title}
              >
                <span className="inline-flex max-w-full min-w-0 items-center justify-center gap-1 whitespace-nowrap @min-[36rem]:gap-0.5 @min-[48rem]:gap-1.5">
                  {loading ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin @min-[36rem]:h-3 @min-[36rem]:w-3 @min-[48rem]:h-4 @min-[48rem]:w-4" />
                  ) : (
                    <PenLine className="h-4 w-4 shrink-0 @min-[36rem]:h-3 @min-[36rem]:w-3 @min-[48rem]:h-4 @min-[48rem]:w-4" />
                  )}
                  Create Manually
                </span>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
          </div>
          <Button type="button" variant="ghost" onClick={() => router.back()} className="self-center">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
