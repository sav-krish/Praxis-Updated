"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, Loader2, Sparkles, FileText, X, Wand2, PenLine } from "lucide-react";
import { toast } from "sonner";

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

interface GeneratedSimulation {
  title: string;
  backgroundContent: string;
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
    goal: "",
    targetDecisions: "",
    pastedText: "",
    aiNotes: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Save generated content to database
  const saveGeneratedSimulation = async (generated: GeneratedSimulation) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in");
    }

    // Create the simulation
    const { data: simulation, error: simError } = await supabase
      .from("simulations")
      .insert({
        professor_id: user.id,
        title: generated.title || formData.title,
        course_topic: formData.courseTopic,
        goal: formData.goal,
        target_decisions: formData.targetDecisions,
        background_content: generated.backgroundContent,
        ai_notes: formData.aiNotes,
        status: "draft",
      })
      .select()
      .single();

    if (simError) throw simError;

    // Create decisions with AI-generated content
    for (let i = 0; i < generated.decisions.length; i++) {
      const genDecision = generated.decisions[i];
      const { data: decision, error: decError } = await supabase
        .from("decisions")
        .insert({
          simulation_id: simulation.id,
          order_num: i + 1,
          prompt: genDecision.prompt,
        })
        .select()
        .single();

      if (decError) throw decError;

      // Create options with AI-generated content
      for (const option of genDecision.options) {
        const { error: optError } = await supabase
          .from("options")
          .insert({
            decision_id: decision.id,
            label: option.label,
            title: option.title,
            description: option.description,
            consequence: option.consequence,
            score: option.score,
          });

        if (optError) throw optError;
      }
    }

    // Create reflection questions
    const questions = generated.reflectionQuestions.length > 0 
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

      if (refError) throw refError;
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
      formPayload.append("goal", formData.goal);
      formPayload.append("targetDecisions", formData.targetDecisions);
      formPayload.append("pastedText", formData.pastedText);
      formPayload.append("aiNotes", formData.aiNotes);
      
      for (const file of files) {
        formPayload.append("files", file);
      }

      const response = await fetch("/api/generate-simulation", {
        method: "POST",
        body: formPayload,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate simulation");
      }

      // Save to database
      const simulationId = await saveGeneratedSimulation(data.simulation);

      toast.success("Simulation generated! Review and edit the content.");
      router.push(`/edit/${simulationId}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to generate simulation");
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

      // Create the simulation
      const { data: simulation, error: simError } = await supabase
        .from("simulations")
        .insert({
          professor_id: user.id,
          title: formData.title,
          course_topic: formData.courseTopic,
          goal: formData.goal,
          target_decisions: formData.targetDecisions,
          ai_notes: formData.aiNotes,
          status: "draft",
        })
        .select()
        .single();

      if (simError) throw simError;

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

        if (decError) throw decError;

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

          if (optError) throw optError;
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

        if (refError) throw refError;
      }

      toast.success("Simulation created! Now let's edit the details.");
      router.push(`/edit/${simulation.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create simulation");
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
          <CardContent>
            <Textarea
              placeholder="e.g., Align with Kotter's change model, Emphasize informal power, Avoid finance-heavy framing"
              value={formData.aiNotes}
              onChange={(e) => setFormData({ ...formData, aiNotes: e.target.value })}
              rows={3}
            />
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
