"use client";

import { useState, useRef, useCallback, useEffect, useMemo, useLayoutEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldInfoHint } from "@/components/ui/field-info-hint";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BackgroundRichTextEditor } from "@/components/ui/background-rich-text-editor";
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Share2,
  Globe,
  Users,
  Trash2,
  Undo2,
  Redo2,
  Plus,
  ImagePlus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataBlockEditor } from "@/components/simulation/DataBlockEditor";
import { DataBlockRenderer } from "@/components/simulation/DataBlockRenderer";
import { FeedbackCard } from "@/components/simulation/FeedbackCard";
import { copySimulationToAccount } from "@/app/(dashboard)/share/[id]/actions";
import { pushConsequenceUpdatesToLiveSession } from "@/app/(dashboard)/session/[id]/actions";
import { PreviewSimulationButton } from "@/components/simulation/PreviewSimulationButton";
import type {
  Simulation,
  Decision,
  Option,
  ReflectionQuestion,
  SimulationProfile,
  SimulationSource,
  SimulationScenarioImage,
  Json,
} from "@/types/database";
import { publicScenarioImageUrl, SCENARIO_IMAGES_BUCKET } from "@/lib/scenario-image-url";
import type { SimulationDataBlock, DataBlockType } from "@/types/data-blocks";
import { SourcesEditor } from "@/components/simulation/sources-editor";
import { AiSectionTrigger } from "@/components/copilot/ai-section-trigger";
import { CopilotPanel, type FocusedSection } from "@/components/copilot/copilot-panel";
import { useAiEdit } from "@/hooks/use-ai-edit";
import { SIMULATION_SCENARIO_IMAGE_ROW } from "@/lib/supabase-query-columns";
import {
  fromDatetimeLocalValue,
  getScheduleValidationMessage,
  getSimulationSessionSchedule,
  setSimulationSessionSchedule,
  toDatetimeLocalValue,
} from "@/lib/session-schedule";
import {
  getSimulationFlowSettings,
  preserveLiveConsequenceSnapshots,
  setSimulationFlowSettings,
} from "@/lib/simulation-flow";

interface DecisionWithOptions extends Decision {
  options: Option[];
}

export type ScenarioImageEditorRow = SimulationScenarioImage & { localFile?: File };

export interface SimulationEditorProps {
  simulation: Simulation;
  decisions: DecisionWithOptions[];
  reflectionQuestions: ReflectionQuestion[];
  dataBlocks: SimulationDataBlock[];
  profiles: SimulationProfile[];
  sources: SimulationSource[];
  scenarioImages?: SimulationScenarioImage[];
  activeSession?: {
    id: string;
    join_code: string;
    status: string;
    created_at: string;
  };
  userId?: string;
  isNewlyGenerated?: boolean;
  isOwner?: boolean;
}

function sanitizeScenarioImageFilename(name: string): string {
  const s = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return s || "image";
}

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function ScenarioImageThumb({ img }: { img: ScenarioImageEditorRow }) {
  const objectUrl = useMemo(() => {
    if (!img.localFile) return null;
    return URL.createObjectURL(img.localFile);
  }, [img.localFile]);

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const src =
    objectUrl || (img.storage_path ? publicScenarioImageUrl(img.storage_path) : "");
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground p-2 text-center">
        Preview after upload
      </div>
    );
  }
  /** `blob:` / `data:` previews are not routed through `next/image`; HTTPS URLs use images.remotePatterns. */
  const needsPlainImg =
    Boolean(objectUrl) || src.startsWith("blob:") || src.startsWith("data:");
  if (needsPlainImg) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- blob: / data: previews cannot use next/image here */
      <img
        src={src}
        alt={img.alt_text || ""}
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <Image
      src={src}
      alt={img.alt_text || ""}
      fill
      className="object-cover"
      sizes="280px"
    />
  );
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
  profiles: initialProfiles = [],
  sources: initialSources = [],
  scenarioImages: initialScenarioImages = [],
  activeSession: initialActiveSession,
  userId,
  isNewlyGenerated = false,
  isOwner = true,
}: SimulationEditorProps) {
  const router = useRouter();
  /** idle | manual = explicit save / tab save; autosave = debounced background save */
  const [saveUi, setSaveUi] = useState<"idle" | "manual" | "autosave">("idle");
  const saveInFlight = saveUi !== "idle";
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [simulation, setSimulation] = useState(initialSimulation);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [reflectionQuestions, setReflectionQuestions] = useState(initialQuestions);
  const [dataBlocks, setDataBlocks] = useState<SimulationDataBlock[]>(initialDataBlocks);
  const [profiles, setProfiles] = useState<SimulationProfile[]>(initialProfiles);
  const [scenarioImages, setScenarioImages] = useState<ScenarioImageEditorRow[]>(() =>
    initialScenarioImages.map((r) => ({ ...r }))
  );
  const scenarioImagesBaselineRef = useRef<SimulationScenarioImage[]>(initialScenarioImages);
  const scenarioFileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);
  const [showFeedbackBanner, setShowFeedbackBanner] = useState(isNewlyGenerated && isOwner);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [focusedSection, setFocusedSection] = useState<FocusedSection | null>(null);
  const [activeSession, setActiveSession] = useState(initialActiveSession);
  const [pushingLiveConsequences, setPushingLiveConsequences] = useState(false);
  const flowSettings = useMemo(
    () => getSimulationFlowSettings(simulation.preferences),
    [simulation.preferences],
  );
  const sessionSchedule = useMemo(
    () => getSimulationSessionSchedule(simulation.preferences),
    [simulation.preferences]
  );
  const scheduleValidationMessage = useMemo(
    () => getScheduleValidationMessage(sessionSchedule),
    [sessionSchedule]
  );

  const handleFocusSection = useCallback((label: string, sectionContext: string) => {
    setFocusedSection({ label, sectionContext });
    setCopilotOpen(true);
  }, []);

  useEffect(() => {
    setScenarioImages(initialScenarioImages.map((r) => ({ ...r })));
    scenarioImagesBaselineRef.current = initialScenarioImages.map((r) => ({ ...r }));
  }, [simulation.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when switching simulations only

  // Dirty tracking: one stringify per state change (useMemo); beforeunload reads a ref (no stringify on each call)
  const cleanSignatureRef = useRef(
    JSON.stringify({
      simulation: initialSimulation,
      decisions: initialDecisions,
      reflectionQuestions: initialQuestions,
      dataBlocks: initialDataBlocks,
      profiles: initialProfiles,
      scenarioImages: initialScenarioImages.map((r) => ({ ...r, pendingFile: false })),
    })
  );
  const dirtyRef = useRef(false);

  const editorStateSignature = useMemo(
    () =>
      JSON.stringify({
        simulation,
        decisions,
        reflectionQuestions,
        dataBlocks,
        profiles,
        scenarioImages: scenarioImages.map((r) => ({
          id: r.id,
          storage_path: r.storage_path,
          alt_text: r.alt_text,
          order_num: r.order_num,
          pendingFile: Boolean(r.localFile),
        })),
      }),
    [simulation, decisions, reflectionQuestions, dataBlocks, profiles, scenarioImages]
  );

  useLayoutEffect(() => {
    dirtyRef.current = editorStateSignature !== cleanSignatureRef.current;
  }, [editorStateSignature]);

  const isDirty = useCallback(() => dirtyRef.current, []);

  const markClean = useCallback(
    (scenarioSnapshot?: ScenarioImageEditorRow[]) => {
      const imgs = scenarioSnapshot ?? scenarioImages;
      cleanSignatureRef.current = JSON.stringify({
        simulation,
        decisions,
        reflectionQuestions,
        dataBlocks,
        profiles,
        scenarioImages: imgs.map((r) => ({
          id: r.id,
          storage_path: r.storage_path,
          alt_text: r.alt_text,
          order_num: r.order_num,
          pendingFile: Boolean(r.localFile),
        })),
      });
      scenarioImagesBaselineRef.current = imgs.map(({ localFile, ...row }) => {
        void localFile;
        return row;
      });
      dirtyRef.current = false;
    },
    [simulation, decisions, reflectionQuestions, dataBlocks, profiles, scenarioImages]
  );

  // Warn on browser close / tab close when dirty
  useEffect(() => {
    if (!isOwner) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isOwner]);

  const handleSaveToDashboard = async () => {
    setSaveUi("manual");
    const result = await copySimulationToAccount(simulation.id);
    setSaveUi("idle");
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Added to your dashboard");
    router.push(`/edit/${result.newId}`);
  };

  const handleSaveSources = useCallback(async (updated: SimulationSource[]) => {
    const supabase = createClient();
    await supabase
      .from("simulation_sources")
      .delete()
      .eq("simulation_id", simulation.id);
    if (updated.length > 0) {
      await supabase.from("simulation_sources").insert(
        updated.map(({ id, simulation_id, label, url, source_type }) => ({
          id,
          simulation_id,
          label,
          url,
          source_type,
        }))
      );
    }
    toast.success("Sources saved");
  }, [simulation.id]);

  const isMissingJustificationTypeColumn = useCallback((error: unknown) => {
    if (!error || typeof error !== "object") return false;
    const maybeMessage = "message" in error && typeof error.message === "string" ? error.message : "";
    const maybeDetails = "details" in error && typeof error.details === "string" ? error.details : "";
    const combined = `${maybeMessage} ${maybeDetails}`.toLowerCase();
    return combined.includes("justification_type") && combined.includes("column");
  }, []);

  const ensureScheduledSession = useCallback(async () => {
    const startAt = sessionSchedule.start_at ? new Date(sessionSchedule.start_at).getTime() : null;
    if (!isOwner || !startAt || startAt <= Date.now()) return null;
    if (activeSession && activeSession.status !== "complete") return activeSession;

    const supabase = createClient();
    const { data: existingSession } = await supabase
      .from("sessions")
      .select("id, join_code, status, created_at")
      .eq("simulation_id", simulation.id)
      .neq("status", "complete")
      .neq("is_preview", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSession) {
      setActiveSession(existingSession);
      return existingSession;
    }

    const { data: newSession, error } = await supabase
      .from("sessions")
      .insert({
        simulation_id: simulation.id,
        join_code: generateJoinCode(),
        status: "lobby",
        current_step: 0,
      })
      .select("id, join_code, status, created_at")
      .single();

    if (error) {
      logger.error(error);
      return null;
    }

    setActiveSession(newSession);
    return newSession;
  }, [activeSession, isOwner, sessionSchedule.start_at, simulation.id]);

  // Core save logic — returns true on success, false on failure
  const performSave = useCallback(async (opts?: { silent?: boolean; autosave?: boolean }): Promise<boolean> => {
    const silent = opts?.silent ?? false;
    const autosave = opts?.autosave ?? false;
    if (!isOwner) return true;
    if (scheduleValidationMessage) {
      toast.error(scheduleValidationMessage);
      return false;
    }
    setSaveUi(autosave ? "autosave" : "manual");
    const supabase = createClient();

    try {
      const { data: storedSimulation } = await supabase
        .from("simulations")
        .select("preferences")
        .eq("id", simulation.id)
        .single();
      const preferences = preserveLiveConsequenceSnapshots(
        simulation.preferences,
        storedSimulation?.preferences,
      );
      const simulationUpdate = {
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
        preferences,
        is_public: simulation.is_public,
        hidden_profiles_enabled: simulation.hidden_profiles_enabled,
        updated_at: new Date().toISOString(),
      };

      let { error: simError } = await supabase
        .from("simulations")
        .update({
          ...simulationUpdate,
          justification_type: simulation.justification_type || "written",
        })
        .eq("id", simulation.id);

      if (simError && isMissingJustificationTypeColumn(simError)) {
        const legacyResult = await supabase
          .from("simulations")
          .update(simulationUpdate)
          .eq("id", simulation.id);
        simError = legacyResult.error;
      }

      if (simError) throw simError;

      const decisionPromises = decisions.flatMap((decision) => [
        supabase
          .from("decisions")
          .update({ prompt: decision.prompt })
          .eq("id", decision.id)
          .then(({ error }: { error: unknown }) => { if (error) throw error; }),
        ...decision.options.map((option) =>
          supabase
            .from("options")
            .update({
              title: option.title,
              description: option.description,
              consequence: option.consequence,
              score: option.score,
            })
            .eq("id", option.id)
            .then(({ error }: { error: unknown }) => { if (error) throw error; })
        ),
      ]);

      const reflectionPromises = reflectionQuestions.map((question) =>
        supabase
          .from("reflection_questions")
          .update({ question: question.question })
          .eq("id", question.id)
          .then(({ error }: { error: unknown }) => { if (error) throw error; })
      );

      await Promise.all([...decisionPromises, ...reflectionPromises]);

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
          data: b.data as unknown as Json,
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

      if (simulation.hidden_profiles_enabled) {
        const initialProfileIds = new Set(initialProfiles.map((p) => p.id));
        for (const pid of initialProfileIds) {
          if (!profiles.some((p) => p.id === pid)) {
            await supabase.from("simulation_profiles").delete().eq("id", pid);
          }
        }
        for (let i = 0; i < profiles.length; i++) {
          const p = profiles[i];
          const payload = {
            simulation_id: simulation.id,
            profile_name: p.profile_name,
            private_briefing: p.private_briefing,
            order_num: i + 1,
          };
          const isNew = !p.id || p.id.startsWith("new-");
          if (isNew) {
            await supabase.from("simulation_profiles").insert(payload);
          } else {
            const { error } = await supabase
              .from("simulation_profiles")
              .update(payload)
              .eq("id", p.id);
            if (error) throw error;
          }
        }
      } else {
        await supabase.from("simulation_profiles").delete().eq("simulation_id", simulation.id);
      }

      const nextScenarioImages: ScenarioImageEditorRow[] = [];
      for (const prev of scenarioImagesBaselineRef.current) {
        if (!scenarioImages.some((s) => s.id === prev.id)) {
          if (prev.storage_path) {
            await supabase.storage.from(SCENARIO_IMAGES_BUCKET).remove([prev.storage_path]);
          }
          if (!String(prev.id).startsWith("new-")) {
            await supabase.from("simulation_scenario_images").delete().eq("id", prev.id);
          }
        }
      }

      for (let i = 0; i < scenarioImages.length; i++) {
        const img = scenarioImages[i];
        let path = img.storage_path;
        if (img.localFile) {
          if (path) {
            await supabase.storage.from(SCENARIO_IMAGES_BUCKET).remove([path]);
          }
          const fname =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? `${crypto.randomUUID()}-${sanitizeScenarioImageFilename(img.localFile.name)}`
              : `${Date.now()}-${sanitizeScenarioImageFilename(img.localFile.name)}`;
          path = `${simulation.id}/${fname}`;
          const { error: upErr } = await supabase.storage
            .from(SCENARIO_IMAGES_BUCKET)
            .upload(path, img.localFile, {
              upsert: false,
              contentType: img.localFile.type || undefined,
            });
          if (upErr) throw upErr;
        }
        if (!path) {
          throw new Error("Each scenario image needs a file");
        }
        const payload = {
          simulation_id: simulation.id,
          storage_path: path,
          alt_text: img.alt_text ?? null,
          order_num: i + 1,
        };
        if (img.id.startsWith("new-")) {
          const { data: inserted, error: insErr } = await supabase
            .from("simulation_scenario_images")
            .insert(payload)
            .select(SIMULATION_SCENARIO_IMAGE_ROW)
            .single();
          if (insErr) throw insErr;
          nextScenarioImages.push({ ...(inserted as SimulationScenarioImage), localFile: undefined });
        } else {
          const { error: upRowErr } = await supabase
            .from("simulation_scenario_images")
            .update({
              storage_path: path,
              alt_text: img.alt_text ?? null,
              order_num: i + 1,
            })
            .eq("id", img.id);
          if (upRowErr) throw upRowErr;
          nextScenarioImages.push({
            ...img,
            storage_path: path,
            order_num: i + 1,
            localFile: undefined,
          });
        }
      }

      setScenarioImages(nextScenarioImages);
      await ensureScheduledSession();
      markClean(nextScenarioImages);
      setLastSavedAt(new Date());
      if (!silent && !autosave) toast.success("Simulation saved!");
      return true;
    } catch (error) {
      logger.error(error);
      toast.error(autosave ? "Auto-save failed — try Save" : "Failed to save simulation");
      return false;
    } finally {
      setSaveUi("idle");
    }
  }, [
    simulation,
    decisions,
    reflectionQuestions,
    dataBlocks,
    profiles,
    scenarioImages,
    initialDataBlocks,
    initialProfiles,
    ensureScheduledSession,
    isMissingJustificationTypeColumn,
    isOwner,
    markClean,
    scheduleValidationMessage,
  ]);

  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;

  useEffect(() => {
    if (!isOwner) return;
    if (editorStateSignature === cleanSignatureRef.current) return;
    const t = setTimeout(() => {
      void performSaveRef.current({ silent: true, autosave: true });
    }, 1800);
    return () => clearTimeout(t);
  }, [editorStateSignature, isOwner]);

  // Autosave on step transition (only if owner and dirty)
  const goToStep = async (nextIndex: number) => {
    if (isOwner && isDirty()) {
      const ok = await performSave({ silent: true });
      if (ok) toast.success("Progress saved", { duration: 1500 });
    }
    setSlideDirection(nextIndex > currentStep ? 1 : -1);
    setCurrentStep(nextIndex);
  };

  // Save then navigate to start session
  const handleStartSession = async () => {
    if (isOwner && isDirty()) {
      const ok = await performSave({ silent: true });
      if (!ok) return;
      toast.success("Simulation saved", { duration: 1500 });
    }
    router.push(`/session/${simulation.id}/new`);
  };

  // Manual save button
  const handleSave = () => performSave({ silent: false });

  const handlePushLiveConsequences = async () => {
    if (!activeSession || activeSession.status === "complete") return;
    setPushingLiveConsequences(true);
    const saved = await performSave({ silent: true });
    if (!saved) {
      setPushingLiveConsequences(false);
      return;
    }
    const result = await pushConsequenceUpdatesToLiveSession(activeSession.id);
    setPushingLiveConsequences(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Consequence updates pushed to the live session");
  };

  const updateDecision = useCallback((index: number, field: string, value: string) => {
    setDecisions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const updateOption = useCallback((decisionIndex: number, optionIndex: number, field: string, value: string | number) => {
    setDecisions(prev => {
      const updated = [...prev];
      const options = [...updated[decisionIndex].options];
      options[optionIndex] = { ...options[optionIndex], [field]: value };
      updated[decisionIndex] = { ...updated[decisionIndex], options };
      return updated;
    });
  }, []);

  const updateReflectionQuestion = useCallback((index: number, value: string) => {
    setReflectionQuestions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], question: value };
      return updated;
    });
  }, []);

  const setField = useCallback((field: string, value: string, opts?: { decisionIndex?: number; optionIndex?: number; questionIndex?: number; blockIndex?: number }) => {
    switch (field) {
      case "background_content":
        setSimulation((prev) => ({ ...prev, background_content: value }));
        break;
      case "title":
        setSimulation((prev) => ({ ...prev, title: value }));
        break;
      case "decision_prompt":
        if (opts?.decisionIndex != null) updateDecision(opts.decisionIndex, "prompt", value);
        break;
      case "option_title":
        if (opts?.decisionIndex != null && opts?.optionIndex != null) updateOption(opts.decisionIndex, opts.optionIndex, "title", value);
        break;
      case "option_description":
        if (opts?.decisionIndex != null && opts?.optionIndex != null) updateOption(opts.decisionIndex, opts.optionIndex, "description", value);
        break;
      case "option_consequence":
        if (opts?.decisionIndex != null && opts?.optionIndex != null) updateOption(opts.decisionIndex, opts.optionIndex, "consequence", value);
        break;
      case "reflection_question":
        if (opts?.questionIndex != null) updateReflectionQuestion(opts.questionIndex, value);
        break;
      case "data_block": {
        if (opts?.blockIndex == null) break;
        const i = opts.blockIndex;
        if (value === "") {
          setDataBlocks((prev) => {
            if (i < 0 || i >= prev.length) return prev;
            const next = prev.filter((_, j) => j !== i);
            return next.map((b, j) => ({ ...b, order_num: j + 1 }));
          });
          break;
        }
        let parsed: { block_type?: DataBlockType; title?: string | null; data?: unknown };
        try {
          parsed = JSON.parse(value) as typeof parsed;
        } catch {
          break;
        }
        const validTypes: DataBlockType[] = ["table", "bar_chart", "line_chart", "kpi_cards", "timeline", "pie_chart"];
        setDataBlocks((prev) => {
          const next = [...prev];
          if (i >= next.length) {
            const type = (parsed.block_type && validTypes.includes(parsed.block_type) ? parsed.block_type : "table") as DataBlockType;
            next.push({
              id: `new-${Date.now()}`,
              simulation_id: simulation.id,
              order_num: next.length + 1,
              block_type: type,
              title: parsed.title ?? null,
              data: (parsed.data ?? DEFAULT_BLOCK_DATA[type]) as SimulationDataBlock["data"],
            });
          } else {
            const cur = next[i];
            const type = (parsed.block_type && validTypes.includes(parsed.block_type) ? parsed.block_type : cur.block_type) as DataBlockType;
            next[i] = {
              ...cur,
              block_type: type,
              title: parsed.title !== undefined ? parsed.title : cur.title,
              data: (parsed.data !== undefined ? parsed.data : cur.data) as SimulationDataBlock["data"],
            };
          }
          return next.map((b, j) => ({ ...b, order_num: j + 1 }));
        });
        break;
      }
    }
  }, [simulation.id, updateDecision, updateOption, updateReflectionQuestion]);

  const getField = useCallback((field: string, opts?: { decisionIndex?: number; optionIndex?: number; questionIndex?: number; blockIndex?: number }): string => {
    switch (field) {
      case "background_content": return simulation.background_content || "";
      case "title": return simulation.title;
      case "decision_prompt":
        if (opts?.decisionIndex != null && opts.decisionIndex < decisions.length) return decisions[opts.decisionIndex].prompt;
        return "";
      case "option_title":
        if (opts?.decisionIndex != null && opts?.optionIndex != null && opts.decisionIndex < decisions.length && opts.optionIndex < decisions[opts.decisionIndex].options.length)
          return decisions[opts.decisionIndex].options[opts.optionIndex].title;
        return "";
      case "option_description":
        if (opts?.decisionIndex != null && opts?.optionIndex != null && opts.decisionIndex < decisions.length && opts.optionIndex < decisions[opts.decisionIndex].options.length)
          return decisions[opts.decisionIndex].options[opts.optionIndex].description || "";
        return "";
      case "option_consequence":
        if (opts?.decisionIndex != null && opts?.optionIndex != null && opts.decisionIndex < decisions.length && opts.optionIndex < decisions[opts.decisionIndex].options.length)
          return decisions[opts.decisionIndex].options[opts.optionIndex].consequence || "";
        return "";
      case "reflection_question":
        if (opts?.questionIndex != null && opts.questionIndex < reflectionQuestions.length) return reflectionQuestions[opts.questionIndex].question;
        return "";
      case "data_block":
        if (opts?.blockIndex != null && opts.blockIndex < dataBlocks.length) {
          const b = dataBlocks[opts.blockIndex];
          return JSON.stringify({ block_type: b.block_type, title: b.title, data: b.data });
        }
        return "";
      default: return "";
    }
  }, [simulation, decisions, reflectionQuestions, dataBlocks]);

  const { applyActions: handleCopilotAction, undo: aiUndo, redo: aiRedo, typing: aiTyping, canUndo: aiCanUndo, canRedo: aiCanRedo } = useAiEdit(setField, getField);

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
    <div className="flex gap-0 items-stretch -mx-3 sm:-mx-4">
      {/* Editor content */}
      <div className="flex-1 min-w-0 max-w-5xl mx-auto px-3 sm:px-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 min-h-[44px] min-w-[44px]"
            onClick={() => {
              if (isOwner && isDirty()) {
                toast.warning("You have unsaved changes. Click Save before leaving, or they will be lost.", { duration: 4000 });
                return;
              }
              router.push(isOwner ? "/dashboard" : "/library");
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {isOwner ? "Edit Simulation" : "View Simulation"}
            </h1>
            <p className="text-muted-foreground text-sm truncate">{simulation.title}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 items-stretch sm:items-end w-full sm:w-auto min-w-0">
          <div className="flex gap-2 flex-wrap justify-end">
            {isOwner ? (
              <>
                {(aiCanUndo || aiCanRedo) && (
                  <div className="flex gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={aiUndo}
                      disabled={!aiCanUndo || aiTyping}
                      className="min-h-[44px] min-w-[44px]"
                      title="Undo AI edit"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={aiRedo}
                      disabled={!aiCanRedo || aiTyping}
                      className="min-h-[44px] min-w-[44px]"
                      title="Redo AI edit"
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button variant="outline" onClick={handleSave} disabled={saveInFlight} className="min-h-[44px] flex-1 sm:flex-none">
                  {saveInFlight ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saveUi === "autosave" ? "Auto-saving…" : saveUi === "manual" ? "Saving…" : "Save"}
                </Button>
                <Link href={`/share/${simulation.id}`} className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full min-h-[44px]">
                    <Share2 className="mr-2 h-4 w-4 shrink-0" />
                    Share
                  </Button>
                </Link>
                <PreviewSimulationButton simulationId={simulation.id} variant="outline" className="min-h-[44px] flex-1 sm:flex-none" />
                <Button onClick={handleStartSession} disabled={saveInFlight} className="flex-1 sm:flex-none min-h-[44px]">
                  {saveInFlight ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4 shrink-0" />}
                  Start Session
                </Button>
              </>
            ) : (
              <Button onClick={handleSaveToDashboard} disabled={saveInFlight} className="min-h-[44px] flex-1 sm:flex-none">
                {saveInFlight ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save to dashboard
              </Button>
            )}
          </div>
          {isOwner && lastSavedAt && !saveInFlight ? (
            <p className="text-xs text-muted-foreground text-right">
              Last saved {lastSavedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}
            </p>
          ) : null}
        </div>
      </div>

      {/* Progress bar + Previous / Next nav */}
      <div className="mb-6 sm:mb-8 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="min-h-[36px] gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="text-sm font-medium text-center">
            Step {currentStep + 1} of {EDITOR_STEPS.length}: {EDITOR_STEPS[currentStep].label}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep === EDITOR_STEPS.length - 1}
            className="min-h-[36px] gap-1.5"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={false}
            animate={{ width: `${((currentStep + 1) / EDITOR_STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6 overflow-hidden">
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
          <Card className="gap-2">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex-1">Simulation Name</CardTitle>
                <FieldInfoHint className="shrink-0">
                  Update the title students and teachers will see for this simulation.
                </FieldInfoHint>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Input
                value={simulation.title}
                onChange={(e) => setSimulation((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter simulation name"
                disabled={!isOwner}
                maxLength={160}
              />
            </CardContent>
          </Card>

          {isOwner ? (
            <AiSectionTrigger
              sectionLabel="Background Content"
              sectionContext={`Background content:\n${(simulation.background_content || "").slice(0, 4000)}`}
              onFocusSection={handleFocusSection}
              active={focusedSection?.label === "Background Content"}
            >
              {(trigger) => (
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <CardTitle className="flex-1">Background Content</CardTitle>
                          <FieldInfoHint className="shrink-0">
                            The scenario and context students will read before making decisions (1-2 pages)
                          </FieldInfoHint>
                        </div>
                      </div>
                      {trigger}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BackgroundRichTextEditor
                      key={simulation.id}
                      value={simulation.background_content || ""}
                      onChange={(md) =>
                        setSimulation({ ...simulation, background_content: md })
                      }
                      placeholder="Write the background scenario here. This is what students will read before making decisions…"
                    />
                  </CardContent>
                </Card>
              )}
            </AiSectionTrigger>
          ) : (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex-1">Background Content</CardTitle>
                  <FieldInfoHint className="shrink-0">
                    The scenario and context students will read before making decisions (1-2 pages)
                  </FieldInfoHint>
                </div>
              </CardHeader>
              <CardContent>
                <BackgroundRichTextEditor
                  key={simulation.id}
                  value={simulation.background_content || ""}
                  onChange={() => {}}
                  disabled
                  placeholder="Background text (read-only)"
                />
              </CardContent>
            </Card>
          )}

          {(isOwner || scenarioImages.length > 0) && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex-1">Scenario images</CardTitle>
                  <FieldInfoHint className="shrink-0 max-w-[220px]">
                    Optional visuals shown to students at the top of the background step during a session.
                  </FieldInfoHint>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {scenarioImages.length === 0 && !isOwner ? (
                  <p className="text-sm text-muted-foreground">No scenario images.</p>
                ) : (
                  scenarioImages.map((img, index) => (
                    <div
                      key={img.id}
                      className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-start"
                    >
                      <div className="relative aspect-video w-full max-w-[280px] shrink-0 overflow-hidden rounded-md bg-muted">
                        <ScenarioImageThumb img={img} />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor={`scenario-alt-${img.id}`}>Description (alt text)</Label>
                        <Input
                          id={`scenario-alt-${img.id}`}
                          value={img.alt_text ?? ""}
                          placeholder="Short description for accessibility"
                          disabled={!isOwner}
                          onChange={(e) =>
                            setScenarioImages((prev) =>
                              prev.map((r, i) =>
                                i === index ? { ...r, alt_text: e.target.value || null } : r
                              )
                            )
                          }
                        />
                        {isOwner && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-9"
                              disabled={index === 0}
                              onClick={() =>
                                setScenarioImages((prev) => {
                                  const next = [...prev];
                                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                  return next.map((r, i) => ({ ...r, order_num: i + 1 }));
                                })
                              }
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-9"
                              disabled={index >= scenarioImages.length - 1}
                              onClick={() =>
                                setScenarioImages((prev) => {
                                  const next = [...prev];
                                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                  return next.map((r, i) => ({ ...r, order_num: i + 1 }));
                                })
                              }
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="min-h-9 text-destructive hover:text-destructive"
                              onClick={() =>
                                setScenarioImages((prev) =>
                                  prev.filter((_, i) => i !== index).map((r, i) => ({
                                    ...r,
                                    order_num: i + 1,
                                  }))
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4 mr-1.5" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isOwner && (
                  <>
                    <input
                      ref={scenarioFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        setScenarioImages((prev) => {
                          const next = [...prev];
                          for (const f of Array.from(files)) {
                            next.push({
                              id: `new-${crypto.randomUUID()}`,
                              simulation_id: simulation.id,
                              storage_path: "",
                              alt_text: null,
                              order_num: next.length + 1,
                              created_at: new Date().toISOString(),
                              localFile: f,
                            });
                          }
                          return next.map((r, i) => ({ ...r, order_num: i + 1 }));
                        });
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit min-h-9"
                      onClick={() => scenarioFileInputRef.current?.click()}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Add images
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Data blocks: tables, charts, timelines */}
          {isOwner ? (
            <AiSectionTrigger
              sectionLabel="Data & Visuals"
              sectionContext={`Data blocks:\n${dataBlocks.map((b, i) => `Block ${i + 1} (${b.block_type}): ${b.title || "Untitled"} — ${JSON.stringify(b.data).slice(0, 500)}`).join("\n")}`}
              onFocusSection={handleFocusSection}
              active={focusedSection?.label === "Data & Visuals"}
            >
              {(trigger) => (
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <CardTitle className="flex-1">Data &amp; Visuals</CardTitle>
                          <FieldInfoHint className="shrink-0">
                            Tables, charts, timelines, and KPI cards shown to students in the background. AI generates these; you can edit or add more.
                          </FieldInfoHint>
                        </div>
                      </div>
                      {trigger}
                    </div>
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
                        <DropdownMenuItem onClick={() => addDataBlock("table")}>Table</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addDataBlock("bar_chart")}>Bar Chart</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addDataBlock("line_chart")}>Line Chart</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addDataBlock("kpi_cards")}>KPI Cards</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addDataBlock("timeline")}>Timeline</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addDataBlock("pie_chart")}>Pie Chart</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              )}
            </AiSectionTrigger>
          ) : (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex-1">Data &amp; Visuals</CardTitle>
                  <FieldInfoHint className="shrink-0">
                    Tables, charts, timelines, and KPI cards shown to students in the background.
                  </FieldInfoHint>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataBlocks.map((block) => (
                  <DataBlockRenderer key={block.id} block={block} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Compact Hidden Profiles — after materials */}
          <Card className="mt-6">
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Label htmlFor="hidden-profiles-bg" className="text-sm font-medium cursor-pointer">Hidden Profiles</Label>
                  <FieldInfoHint>
                    Give each participant a unique role with private information. Assigned automatically at session start.
                  </FieldInfoHint>
                </div>
                <button
                  id="hidden-profiles-bg"
                  type="button"
                  role="switch"
                  aria-checked={simulation.hidden_profiles_enabled}
                  disabled={!isOwner}
                  onClick={() => {
                    if (!isOwner) return;
                    const enabling = !simulation.hidden_profiles_enabled;
                    setSimulation({ ...simulation, hidden_profiles_enabled: enabling });
                    if (enabling && profiles.length === 0) {
                      setProfiles([
                        { id: `new-${Date.now()}-1`, simulation_id: simulation.id, profile_name: "", private_briefing: "", order_num: 1, created_at: "" },
                        { id: `new-${Date.now()}-2`, simulation_id: simulation.id, profile_name: "", private_briefing: "", order_num: 2, created_at: "" },
                      ]);
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    !isOwner ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${simulation.hidden_profiles_enabled ? "bg-primary" : "bg-input"}`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      simulation.hidden_profiles_enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {simulation.hidden_profiles_enabled && (
                <div className="space-y-3 pt-1">
                  {profiles.map((profile, index) => (
                    <div key={profile.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs">Role {index + 1}</Badge>
                        {isOwner && profiles.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setProfiles(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, order_num: i + 1 })));
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder='e.g. "CEO", "CFO"'
                        value={profile.profile_name}
                        onChange={(e) => {
                          setProfiles(prev => prev.map((p, i) => i === index ? { ...p, profile_name: e.target.value } : p));
                        }}
                        disabled={!isOwner}
                        className="h-8 text-sm"
                      />
                      <Textarea
                        placeholder="Private information only this role sees..."
                        value={profile.private_briefing}
                        onChange={(e) => {
                          setProfiles(prev => prev.map((p, i) => i === index ? { ...p, private_briefing: e.target.value } : p));
                        }}
                        rows={2}
                        disabled={!isOwner}
                        className="text-sm"
                      />
                    </div>
                  ))}

                  {isOwner && profiles.length < 6 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setProfiles(prev => [
                          ...prev,
                          { id: `new-${Date.now()}`, simulation_id: simulation.id, profile_name: "", private_briefing: "", order_num: prev.length + 1, created_at: "" },
                        ]);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Role ({profiles.length}/6)
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
          {activeSession && activeSession.status !== "complete" ? (
            <Card className="border-amber-300/70 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Editing while a session is active</p>
                  <p className="text-sm text-muted-foreground">
                    Saved consequence edits apply to future sessions. Students in the current
                    session keep the stored live version until you explicitly push updates.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={pushingLiveConsequences || saveInFlight}
                  onClick={() => void handlePushLiveConsequences()}
                >
                  {pushingLiveConsequences ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="mr-2 h-4 w-4" />
                  )}
                  Push Updates to Live Session
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {decisions.map((decision, dIndex) => (
            <AiSectionTrigger
              key={decision.id}
              sectionLabel={`Decision ${decision.order_num}`}
              sectionContext={
                `Decision ${decision.order_num} (index ${dIndex}):\nPrompt: ${decision.prompt}\n\n` +
                decision.options.map((o, oi) =>
                  `Option ${o.label} (index ${oi}): ${o.title}\n  Description: ${o.description || "(empty)"}\n  Consequence: ${o.consequence || "(empty)"}\n  Score: ${o.score}`
                ).join("\n\n")
              }
              onFocusSection={handleFocusSection}
              active={focusedSection?.label === `Decision ${decision.order_num}`}
            >
              {(trigger) => (
                <Collapsible defaultOpen={false} className="group/decision">
                  <Card className="overflow-hidden p-0 gap-0">
                    <div className="flex items-center gap-0">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex-1 text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-3 bg-transparent hover:bg-muted transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-w-0"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <Badge variant="outline" className="shrink-0">Decision {decision.order_num}</Badge>
                          </div>
                          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/decision:rotate-180 ml-2" />
                        </button>
                      </CollapsibleTrigger>
                      {isOwner && (
                        <div className="pr-3 sm:pr-4 shrink-0">
                          {trigger}
                        </div>
                      )}
                    </div>
                    <CollapsibleContent>
                      <CardContent className="space-y-6 border-t pt-6">
                        <div className="space-y-2">
                          <Label>Decision Prompt</Label>
                          <Textarea
                            placeholder="Enter the decision question students will see"
                            value={decision.prompt}
                            onChange={(e) => updateDecision(dIndex, "prompt", e.target.value)}
                            rows={3}
                            disabled={!isOwner}
                          />
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <Label>Options</Label>
                          {decision.options.map((option, oIndex) => (
                            <div
                              key={option.id}
                              className={`border rounded-lg p-3 sm:p-4 space-y-4 ${oIndex === 2 ? "mb-4 sm:mb-6" : ""}`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="shrink-0">{option.label}</Badge>
                                <Input
                                  placeholder="Option title"
                                  value={option.title}
                                  onChange={(e) => updateOption(dIndex, oIndex, "title", e.target.value)}
                                  className="flex-1 min-w-[120px]"
                                  disabled={!isOwner}
                                />
                                <div className="flex items-center gap-2 shrink-0">
                                  <Label className="text-sm whitespace-nowrap">Score:</Label>
                                  <Select
                                    value={String(option.score)}
                                    onValueChange={(value) => updateOption(dIndex, oIndex, "score", parseInt(value))}
                                    disabled={!isOwner}
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
                                  disabled={!isOwner}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Consequence</Label>
                                <Textarea
                                  placeholder="What happens when this option is chosen?"
                                  value={option.consequence || ""}
                                  onChange={(e) => updateOption(dIndex, oIndex, "consequence", e.target.value)}
                                  rows={2}
                                  disabled={!isOwner}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Saved edits are used in future sessions. Active sessions change
                                  only after “Push Updates to Live Session.”
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}
            </AiSectionTrigger>
          ))}

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
          {isOwner ? (
            <AiSectionTrigger
              sectionLabel="Reflection Questions"
              sectionContext={reflectionQuestions.map((q, i) =>
                `Question ${i + 1} (index ${i}): ${q.question}`
              ).join("\n")}
              onFocusSection={handleFocusSection}
              active={focusedSection?.label === "Reflection Questions"}
            >
              {(trigger) => (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-start gap-1.5">
                          <CardTitle className="flex-1">Reflection Questions</CardTitle>
                          <FieldInfoHint className="shrink-0">
                            Questions students will answer after completing all decisions
                          </FieldInfoHint>
                        </div>
                      </div>
                      {trigger}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {reflectionQuestions.map((question, index) => (
                      <div key={question.id} className="space-y-2">
                        <Label>Question {index + 1}</Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) => updateReflectionQuestion(index, e.target.value)}
                          placeholder="Enter reflection question..."
                          rows={2}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </AiSectionTrigger>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex-1">Reflection Questions</CardTitle>
                  <FieldInfoHint className="shrink-0">
                    Questions students will answer after completing all decisions
                  </FieldInfoHint>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {reflectionQuestions.map((question, index) => (
                  <div key={question.id} className="space-y-2">
                    <Label>Question {index + 1}</Label>
                    <Textarea
                      value={question.question}
                      placeholder="Enter reflection question..."
                      rows={2}
                      disabled
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
          {showFeedbackBanner && (
            <FeedbackCard
              simulationId={simulation.id}
              userId={userId}
              feedbackType="post_generation"
              role="professor"
              onDismiss={() => setShowFeedbackBanner(false)}
            />
          )}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex-1">Run Settings</CardTitle>
                <FieldInfoHint className="shrink-0">
                  Configure how students participate in this simulation
                </FieldInfoHint>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Participation Mode</Label>
                <Select
                  value={simulation.mode}
                  onValueChange={(value: "individual" | "teams") => 
                    setSimulation({
                      ...simulation,
                      mode: value,
                      justification_type: value === "teams" ? "written" : simulation.justification_type,
                    })
                  }
                  disabled={!isOwner}
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

              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Class Votes stage</Label>
                    <p className="text-sm text-muted-foreground">
                      Show class vote results after the final consequence and before reflection.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flowSettings.classVotesEnabled}
                    disabled={!isOwner}
                    onClick={() =>
                      setSimulation((prev) => ({
                        ...prev,
                        preferences: setSimulationFlowSettings(prev.preferences, {
                          ...getSimulationFlowSettings(prev.preferences),
                          classVotesEnabled:
                            !getSimulationFlowSettings(prev.preferences).classVotesEnabled,
                        }),
                      }))
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      flowSettings.classVotesEnabled ? "bg-primary" : "bg-input"
                    }`}
                  >
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-background shadow transition-transform ${
                        flowSettings.classVotesEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {flowSettings.classVotesEnabled ? (
                  <div className="flex items-center justify-between gap-4 border-t pt-3">
                    <div>
                      <Label>Show submission status</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow students to see submitted count and class percentage.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={flowSettings.showVoteSubmissionStatus}
                      disabled={!isOwner}
                      onClick={() =>
                        setSimulation((prev) => ({
                          ...prev,
                          preferences: setSimulationFlowSettings(prev.preferences, {
                            ...getSimulationFlowSettings(prev.preferences),
                            showVoteSubmissionStatus:
                              !getSimulationFlowSettings(prev.preferences)
                                .showVoteSubmissionStatus,
                          }),
                        }))
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        flowSettings.showVoteSubmissionStatus ? "bg-primary" : "bg-input"
                      }`}
                    >
                      <span
                        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-background shadow transition-transform ${
                          flowSettings.showVoteSubmissionStatus
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ) : null}
              </div>

              {simulation.mode === "individual" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label>Decision Justification Format</Label>
                    <FieldInfoHint>
                      Written is the default. Video requires a recording or upload. Video or text lets the student choose either format before moving to the next decision.
                    </FieldInfoHint>
                  </div>
                  <Select
                    value={simulation.justification_type || "written"}
                    onValueChange={(value: "written" | "video" | "video_or_text") =>
                      setSimulation({ ...simulation, justification_type: value })
                    }
                    disabled={!isOwner}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="written">Written justification</SelectItem>
                      <SelectItem value="video">Video response</SelectItem>
                      <SelectItem value="video_or_text">Video or text response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {simulation.mode === "teams" && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label>Team Assignment</Label>
                      <FieldInfoHint>
                        In team mode, only one designated voter per team can submit responses.
                      </FieldInfoHint>
                    </div>
                    <Select
                      value={simulation.team_assignment || "auto"}
                      onValueChange={(value: "auto" | "self") => 
                        setSimulation({ ...simulation, team_assignment: value })
                      }
                      disabled={!isOwner}
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
                    <div className="flex items-center gap-1.5">
                      <Label>Team Size</Label>
                      <FieldInfoHint>
                        Number of students per team (for auto-assign)
                      </FieldInfoHint>
                    </div>
                    <Input
                      type="number"
                      min={2}
                      max={50}
                      value={simulation.team_size || 4}
                      onChange={(e) => 
                        setSimulation({ ...simulation, team_size: parseInt(e.target.value) })
                      }
                      className="w-32"
                      disabled={!isOwner}
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-1.5">
                  <Label>Optional Session Schedule</Label>
                  <FieldInfoHint>
                    If set, sessions created from this simulation will auto-start at the scheduled start and auto-end at the scheduled end. Educators can still end a session manually at any time.
                  </FieldInfoHint>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-start">Start date &amp; time</Label>
                    <Input
                      id="scheduled-start"
                      type="datetime-local"
                      value={toDatetimeLocalValue(sessionSchedule.start_at)}
                      onChange={(e) =>
                        setSimulation((prev) => ({
                          ...prev,
                          preferences: setSimulationSessionSchedule(prev.preferences, {
                            ...getSimulationSessionSchedule(prev.preferences),
                            start_at: fromDatetimeLocalValue(e.target.value),
                          }),
                        }))
                      }
                      disabled={!isOwner}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled-end">End date &amp; time</Label>
                    <Input
                      id="scheduled-end"
                      type="datetime-local"
                      value={toDatetimeLocalValue(sessionSchedule.end_at)}
                      onChange={(e) =>
                        setSimulation((prev) => ({
                          ...prev,
                          preferences: setSimulationSessionSchedule(prev.preferences, {
                            ...getSimulationSessionSchedule(prev.preferences),
                            end_at: fromDatetimeLocalValue(e.target.value),
                          }),
                        }))
                      }
                      disabled={!isOwner}
                    />
                  </div>
                </div>
                {scheduleValidationMessage ? (
                  <p className="text-sm text-destructive">{scheduleValidationMessage}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Leave either field blank if you do not want that automatic behavior.
                  </p>
                )}
                {(sessionSchedule.start_at || sessionSchedule.end_at) && (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setSimulation((prev) => ({
                          ...prev,
                          preferences: setSimulationSessionSchedule(prev.preferences, {
                            start_at: null,
                            end_at: null,
                          }),
                        }))
                      }
                      disabled={!isOwner}
                    >
                      Clear schedule
                    </Button>
                  </div>
                )}
                {sessionSchedule.start_at && new Date(sessionSchedule.start_at).getTime() > Date.now() && activeSession ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                    <p className="text-sm font-medium">Scheduled session ready</p>
                    <p className="text-sm text-muted-foreground">
                      Join code: <span className="font-semibold tracking-wide text-foreground">{activeSession.join_code}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          await navigator.clipboard.writeText(activeSession.join_code);
                          toast.success("Join code copied");
                        }}
                      >
                        Copy Code
                      </Button>
                      <Link href={`/session/${simulation.id}/${activeSession.id}`}>
                        <Button type="button" variant="outline">
                          Open Session Lobby
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex flex-1 items-center gap-2 min-w-0">
                  <Globe className="h-5 w-5 shrink-0" />
                  <span>Share to Library</span>
                  <FieldInfoHint>
                      Other professors and students can browse and favorite your simulation. When published, your simulation appears in the public library and community members can favorite it to boost its ranking.
                  </FieldInfoHint>
                </CardTitle>

              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Label htmlFor="share-library" className="cursor-pointer">
                      Publish to Simulation Library
                    </Label>

                  </div>
                </div>
                <button
                  id="share-library"
                  type="button"
                  role="switch"
                  aria-checked={simulation.is_public}
                  disabled={!isOwner}
                  onClick={() => isOwner && setSimulation({ ...simulation, is_public: !simulation.is_public })}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    !isOwner ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${simulation.is_public ? "bg-primary" : "bg-input"}`}
                >
                  <span
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      simulation.is_public ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {isOwner && simulation.is_public && (
                <>
                  <Separator />
                  <SourcesEditor
                    variant="library"
                    simulationId={simulation.id}
                    sources={initialSources}
                    onSave={handleSaveSources}
                  />
                </>
              )}
            </CardContent>
          </Card>

          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </div>

      </div>

      {isOwner && (
        <CopilotPanel
          context={{
            page: "editor",
            simulationTitle: simulation.title,
            subject: simulation.course_topic,
            backgroundContent: simulation.background_content || undefined,
            decisions: decisions.map((d, i) =>
              `Decision ${i + 1} (index ${i}): ${d.prompt}\n` +
              d.options.map((o, oi) =>
                `  Option ${o.label} (index ${oi}): ${o.title} (score ${o.score})\n` +
                `    Description: ${o.description || "(empty)"}\n` +
                `    Consequence: ${o.consequence || "(empty)"}`
              ).join("\n")
            ).join("\n\n") || undefined,
            reflectionQuestions: reflectionQuestions.map((q, i) =>
              `Question ${i + 1} (index ${i}): ${q.question}`
            ).join("\n") || undefined,
            dataBlocks:
              dataBlocks.length > 0
                ? dataBlocks
                    .map((b, i) => {
                      const payload = JSON.stringify({ block_type: b.block_type, title: b.title, data: b.data });
                      const clipped = payload.length > 1200 ? `${payload.slice(0, 1200)}…` : payload;
                      return `Block index ${i} (${b.block_type}, title: ${b.title ?? "(none)"}): ${clipped}`;
                    })
                    .join("\n\n")
                : "No data blocks yet. To add one via [ACTION], use blockIndex 0 with a full block JSON.",
          }}
          onAction={handleCopilotAction}
          onUndo={aiUndo}
          open={copilotOpen}
          onToggle={() => setCopilotOpen((o) => !o)}
          focusedSection={focusedSection}
          onClearFocus={() => setFocusedSection(null)}
        />
      )}
    </div>
  );
}
