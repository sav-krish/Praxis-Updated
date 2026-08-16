"use client";

import { useEffect, useState, useRef, use } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  Clock,
  Trophy,
  ChevronDown,
  RefreshCw,
  LogOut,
  Video,
  Upload,
  Circle,
  Square,
  Star,
  TrendingUp,
  Minus,
  TrendingDown,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { endPreviewSession } from "@/app/(dashboard)/session/[id]/actions";
import {
  optionScoreToTier,
  type LeaderboardTier,
} from "@/lib/student/leaderboard";
import { DataBlockRenderer } from "@/components/simulation/DataBlockRenderer";
import { FeedbackCard } from "@/components/simulation/FeedbackCard";
import { sourceTypeDisplayLabel } from "@/lib/source-display";
import { publicScenarioImageUrl } from "@/lib/scenario-image-url";
import { formatScheduleDateTime, getSimulationSessionSchedule } from "@/lib/session-schedule";
import type { Json } from "@/types/database";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  calculateQualitativeImpact,
  type QualitativeImpact,
} from "@/lib/student/qualitative-impact";
import { getSimulationFlowSettings } from "@/lib/simulation-flow";
import { PraxisLogo } from "@/components/praxis-logo";
import { useStudentLeaderboardPhase } from "@/components/simulation/student-experience-shell";

const MarkdownBody = dynamic(
  () =>
    import("@/components/ui/markdown-body").then((m) => m.MarkdownBody),
  {
    ssr: false,
    loading: () => (
      <div className="h-20 animate-pulse rounded-md bg-muted/40" aria-hidden />
    ),
  }
);

interface Option {
  id: string;
  label: string;
  title: string;
  description: string | null;
  consequence: string | null;
  score: number;
}

type DecisionOutcomeSnapshot = {
  consequence: string;
  outcomeReasoning: string;
  dataImpact?: QualitativeImpact[];
  tier: LeaderboardTier;
};

function decisionOutcomeStorageKey(
  sessionId: string,
  participantId: string,
  decisionId: string,
) {
  return `praxis_decision_outcome_${sessionId}_${participantId}_${decisionId}`;
}

function readDecisionOutcomeSnapshot(
  sessionId: string,
  participantId: string,
  decisionId: string,
): DecisionOutcomeSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(
      decisionOutcomeStorageKey(sessionId, participantId, decisionId),
    );
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<DecisionOutcomeSnapshot>;
    if (!parsed || typeof parsed.consequence !== "string") return null;

    const tier =
      parsed.tier === "Perfect" ||
      parsed.tier === "Good" ||
      parsed.tier === "Decent" ||
      parsed.tier === "Poor"
        ? parsed.tier
        : "Poor";

    return {
      consequence: parsed.consequence,
      outcomeReasoning:
        typeof parsed.outcomeReasoning === "string" ? parsed.outcomeReasoning : "",
      dataImpact: Array.isArray(parsed.dataImpact)
        ? (parsed.dataImpact as QualitativeImpact[])
        : undefined,
      tier,
    };
  } catch {
    return null;
  }
}

function writeDecisionOutcomeSnapshot(
  sessionId: string,
  participantId: string,
  decisionId: string,
  snapshot: DecisionOutcomeSnapshot,
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      decisionOutcomeStorageKey(sessionId, participantId, decisionId),
      JSON.stringify(snapshot),
    );
  } catch {
    // A result can still render from component state when storage is unavailable.
  }
}

const OUTCOME_TIER_STYLES: Record<
  LeaderboardTier,
  {
    container: string;
    icon: string;
    label: string;
    badge: string;
  }
> = {
  Perfect: {
    container:
      "border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/30",
    icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-200",
    label: "text-blue-800 dark:text-blue-200",
    badge:
      "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/70 dark:text-blue-200",
  },
  Good: {
    container:
      "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30",
    icon:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200",
    label: "text-emerald-800 dark:text-emerald-200",
    badge:
      "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/70 dark:text-emerald-200",
  },
  Decent: {
    container:
      "border-lime-200 bg-lime-50/70 dark:border-lime-900 dark:bg-lime-950/30",
    icon: "bg-lime-100 text-lime-800 dark:bg-lime-900/70 dark:text-lime-200",
    label: "text-lime-900 dark:text-lime-200",
    badge:
      "bg-lime-100 text-lime-900 hover:bg-lime-100 dark:bg-lime-900/70 dark:text-lime-200",
  },
  Poor: {
    container:
      "border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/30",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/70 dark:text-rose-200",
    label: "text-rose-800 dark:text-rose-200",
    badge:
      "bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-900/70 dark:text-rose-200",
  },
};

const COMPLETION_OUTCOME_ICON_STYLES: Record<LeaderboardTier, string> = {
  Perfect: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Decent: "bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-200",
  Poor: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
};

interface Decision {
  id: string;
  order_num: number;
  prompt: string;
  options: Option[];
}

interface Session {
  id: string;
  status: string;
  current_step: number;
  is_preview?: boolean;
  student_flow_settings?: Json | null;
  simulation: {
    id: string;
    title: string;
    background_content: string | null;
    mode: string;
    team_assignment?: "auto" | "self" | null;
    team_size?: number | null;
    justification_type: "written" | "video" | "video_or_text";
    estimated_minutes?: number | null;
    hidden_profiles_enabled?: boolean;
    preferences?: Json;
  };
}

interface TeamMember {
  id: string;
  name: string;
  team_id: string | null;
  is_voter: boolean;
}

interface TeamDecisionSubmission {
  id: string;
  team_id: string;
  decision_id: string;
  option_id: string;
  submitted_at: string;
}

interface PlayerProfile {
  profile_name: string;
  private_briefing: string;
}

interface AvailableProfile {
  id: string;
  profile_name: string;
}

interface ReflectionQuestion {
  id: string;
  order_num: number;
  question: string;
}

interface PlaySessionPayload {
  session: Session;
  participantCount: number;
  studentAttemptSource: "explore" | "classroom" | null;
  participant: {
    id: string;
    name: string;
    profile_id: string | null;
    team_id: string | null;
    is_voter: boolean;
  } | null;
  team: { id: string; name: string; members: TeamMember[] } | null;
  teamDecisions: TeamDecisionSubmission[];
  playerProfile: PlayerProfile | null;
  availableProfiles: AvailableProfile[];
  decisions: Decision[];
  reflectionQuestions: ReflectionQuestion[];
  dataBlocks: Array<{ id: string; block_type: string; title: string | null; data: unknown }>;
  sources: Array<{ id: string; label: string; url?: string | null; source_type?: string | null }>;
  scenarioImages: Array<{ id: string; storage_path: string; alt_text: string | null; order_num: number }>;
  responses: Array<{ decision_id: string; option_id: string }>;
  reflectionResponseQuestionIds: string[];
  submissionStatus: {
    decisionId: string;
    submitted: number;
    eligible: number;
  } | null;
  classVotes: {
    decisionId: string;
    totalSubmitted: number;
    totalEligible: number;
    optionIds: string[];
    justifications: Array<{ optionId: string; text: string }>;
  } | null;
}

function roundedPercentages(counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);
  const exact = counts.map((count) => (count / total) * 100);
  const floors = exact.map(Math.floor);
  const remaining = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; index < remaining; index += 1) {
    floors[order[index].index] += 1;
  }
  return floors;
}

function SimulationTopHeader({
  decisionCount,
  activeStage,
  roleLabel,
}: {
  decisionCount: number;
  activeStage: string;
  roleLabel: string;
}) {
  const normalizedDecisionCount = Math.max(0, decisionCount);
  const totalStages = normalizedDecisionCount + 2; // Reflection + Completion.
  const activeDecision = activeStage.startsWith("decision-")
    ? Number(activeStage.replace("decision-", ""))
    : 0;
  const currentDecision = Math.max(
    0,
    Math.min(activeDecision || 0, normalizedDecisionCount),
  );
  const isReflection = activeStage === "reflection";
  const isComplete = activeStage === "completion" || activeStage === "results";
  const completedStages = isComplete
    ? totalStages
    : isReflection
      ? normalizedDecisionCount + 1
      : currentDecision;
  const stageLabel = isComplete
    ? "Completed"
    : isReflection
      ? "Reflection"
      : activeStage === "background"
        ? "Background"
        : `Decision ${currentDecision} of ${normalizedDecisionCount}`;

  return (
    <div className="overflow-hidden rounded-xl border border-[#fee2d2] bg-white shadow-sm dark:border-[#1f2937] dark:bg-[#111827]">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
        <PraxisLogo size="compact" priority />
        <div
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
          aria-label={`${stageLabel}. ${completedStages} of ${totalStages} stages complete`}
        >
          <span className="text-[11px] font-medium text-[#374151] dark:text-[#e5e7eb] sm:text-xs">
            {stageLabel}
          </span>
          <span className="flex max-w-full items-center justify-start gap-1 overflow-x-auto pb-px touch-pan-x sm:justify-center sm:gap-1.5">
            {Array.from({ length: Math.max(2, totalStages) }, (_, index) => (
              <span
                key={index}
                className={`h-1 w-4 shrink-0 rounded-full sm:w-9 ${
                  index < completedStages
                    ? "bg-[#f97316] dark:bg-[#fb923c]"
                    : "bg-[#e5e7eb] dark:bg-[#374151]"
                }`}
              />
            ))}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Badge className="hidden max-w-32 truncate bg-[#fff1e8] px-2.5 py-1 text-[11px] font-medium text-[#9a3412] hover:bg-[#fff1e8] dark:bg-[#7c2d12]/40 dark:text-[#fdba74] sm:inline-flex sm:max-w-40">
            {roleLabel}
          </Badge>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setLeaderboardPhase = useStudentLeaderboardPhase();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [reflectionQuestions, setReflectionQuestions] = useState<ReflectionQuestion[]>([]);
  const [dataBlocks, setDataBlocks] = useState<Array<{ id: string; block_type: string; title: string | null; data: unknown }>>([]);
  const [sources, setSources] = useState<Array<{ id: string; label: string; url?: string | null; source_type?: string | null }>>([]);
  const [scenarioImages, setScenarioImages] = useState<
    Array<{ id: string; storage_path: string; alt_text: string | null; order_num: number }>
  >([]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string>("");
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<AvailableProfile[]>([]);
  const [classVotes, setClassVotes] = useState<PlaySessionPayload["classVotes"]>(null);
  const [classVotesDecisionIndex, setClassVotesDecisionIndex] = useState<number | null>(null);
  const [submissionStatus, setSubmissionStatus] =
    useState<PlaySessionPayload["submissionStatus"]>(null);
  const [justificationVoteTab, setJustificationVoteTab] = useState("A");
  const [showAllJustifications, setShowAllJustifications] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(0); // 0 waiting, 1 background, 2-4 decisions, 5 class votes, 6 reflection, 7 results
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [showConsequence, setShowConsequence] = useState(false);
  const [currentConsequence, setCurrentConsequence] = useState("");
  const [currentDataImpact, setCurrentDataImpact] = useState<QualitativeImpact[] | undefined>(undefined);
  const [outcomeTier, setOutcomeTier] = useState<LeaderboardTier | null>(null);
  const [outcomeReasoning, setOutcomeReasoning] = useState("");
  const [myResponses, setMyResponses] = useState<{ decision_id: string; option_id: string; score: number }[]>([]);
  const [decisionOutcomeSnapshots, setDecisionOutcomeSnapshots] = useState<
    Record<string, DecisionOutcomeSnapshot>
  >({});
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [teamDecisions, setTeamDecisions] = useState<TeamDecisionSubmission[]>([]);
  const [isTeamVoter, setIsTeamVoter] = useState<boolean>(true);
  const [returnToStep, setReturnToStep] = useState<number | null>(null);
  const [returnToConsequence, setReturnToConsequence] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [leavingPreview, setLeavingPreview] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [preparingRecorder, setPreparingRecorder] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [responseInputMode, setResponseInputMode] = useState<"text" | "video">("text");
  const [studentAttemptId, setStudentAttemptId] = useState<string | null>(null);
  const [studentAttemptSource, setStudentAttemptSource] = useState<
    PlaySessionPayload["studentAttemptSource"]
  >(null);
  const [completedReportId, setCompletedReportId] = useState<string | null>(null);
  const [completionRank, setCompletionRank] = useState<number | null>(null);
  const [completionRankLoading, setCompletionRankLoading] = useState(false);
  const [expandedDecisionIds, setExpandedDecisionIds] = useState<string[]>([]);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [completionNavigation, setCompletionNavigation] = useState<
    "dashboard" | "home" | null
  >(null);
  const [aiJustificationFeedback, setAiJustificationFeedback] = useState<string | null>(null);
  const [selectedRoleLabel, setSelectedRoleLabel] = useState("Decision maker");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveVideoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);

  const currentStepRef = useRef(currentStep);
  const sessionIdRef = useRef<string | null>(null);
  const transitionRef = useRef(false);
  const completionNavigationRef = useRef(false);

  const persistDecisionOutcome = (
    decisionId: string,
    snapshot: DecisionOutcomeSnapshot,
  ) => {
    setDecisionOutcomeSnapshots((current) => ({
      ...current,
      [decisionId]: snapshot,
    }));
    if (session?.id && participantId) {
      writeDecisionOutcomeSnapshot(session.id, participantId, decisionId, snapshot);
    }
  };

  const navigateAfterCompletion = (destination: "dashboard" | "home") => {
    if (completionNavigationRef.current) return;
    completionNavigationRef.current = true;
    setCompletionNavigation(destination);
    router.push(destination === "dashboard" ? "/dashboard" : "/");
  };

  useEffect(() => {
    if (currentStep === 7 || session?.status === "complete") {
      setLeaderboardPhase("completion");
      return;
    }

    setLeaderboardPhase(
      currentStep >= 1 && currentStep < 6 ? "decision" : "reflection",
    );
  }, [currentStep, session?.status, setLeaderboardPhase]);

  useEffect(() => {
    return () => setLeaderboardPhase("reflection");
  }, [setLeaderboardPhase]);

  useEffect(() => {
    if (!session?.id || !participantId || decisions.length === 0) return;

    const storedSnapshots = decisions.reduce<Record<string, DecisionOutcomeSnapshot>>(
      (collected, decision) => {
        const snapshot = readDecisionOutcomeSnapshot(
          session.id,
          participantId,
          decision.id,
        );
        if (snapshot) collected[decision.id] = snapshot;
        return collected;
      },
      {},
    );
    if (Object.keys(storedSnapshots).length === 0) return;

    setDecisionOutcomeSnapshots((current) => {
      const missingSnapshots = Object.entries(storedSnapshots).filter(
        ([decisionId]) => !current[decisionId],
      );
      return missingSnapshots.length > 0
        ? { ...current, ...Object.fromEntries(missingSnapshots) }
        : current;
    });
  }, [decisions, participantId, session?.id]);

  useEffect(() => {
    if (currentStep !== 7 || !participantId) return;

    let active = true;
    const loadCompletionRank = async () => {
      setCompletionRankLoading(true);
      try {
        const response = await fetch(
          `/api/play/session/${encodeURIComponent(code)}/leaderboard?participantId=${encodeURIComponent(participantId)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => null)) as {
          viewer?: { rank?: number | null };
        } | null;
        if (active && response.ok) setCompletionRank(payload?.viewer?.rank ?? null);
      } catch {
        if (active) setCompletionRank(null);
      } finally {
        if (active) setCompletionRankLoading(false);
      }
    };

    void loadCompletionRank();
    const intervalId = window.setInterval(() => void loadCompletionRank(), 3_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [code, currentStep, participantId]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Each simulation stage can be much taller than a phone viewport. Reset both
  // the document and the stage's scroll container after a transition so a
  // student never lands midway through the next decision or result screen.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
      document
        .querySelectorAll<HTMLElement>("[data-simulation-scroll-container]")
        .forEach((container) => container.scrollTo({ top: 0, left: 0 }));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentStep, showConsequence]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  useEffect(() => {
    const videoElement = liveVideoPreviewRef.current;
    if (!videoElement) return;

    if (recording && mediaStreamRef.current) {
      videoElement.srcObject = mediaStreamRef.current;
      void videoElement.play().catch(() => {});
      return;
    }

    videoElement.pause();
    videoElement.srcObject = null;
  }, [recording]);

  const scheduledStartLabel = formatScheduleDateTime(
    session ? getSimulationSessionSchedule(session.simulation.preferences).start_at : null
  );
  const scheduledEndLabel = formatScheduleDateTime(
    session ? getSimulationSessionSchedule(session.simulation.preferences).end_at : null
  );

  // Subscribe to participant count while waiting
  useEffect(() => {
    if (!session || currentStep !== 0) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`play-participants-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${session.id}` },
        () => {
          supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id)
            .then(({ count }) => setParticipantCount(count ?? 0));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, currentStep]);

  // Subscribe to session updates
  useEffect(() => {
    if (!session) return;
    sessionIdRef.current = session.id;

    const supabase = createClient();
    const channel = supabase
      .channel(`session-play-${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          const updated = payload.new as { status: string; current_step: number };
          if (updated.status === "running" && currentStepRef.current === 0) {
            setCurrentStep(1);
          }
          if (updated.status === "complete") {
            setCurrentStep(7);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Sync scheduled start/end
  useEffect(() => {
    if (!session || session.is_preview || session.status === "complete") return;

    const syncScheduledStatus = async () => {
      if (transitionRef.current) return;
      const supabase = createClient();
      const schedule = getSimulationSessionSchedule(session.simulation.preferences);
      const now = Date.now();
      const endAt = schedule.end_at ? new Date(schedule.end_at).getTime() : null;
      const startAt = schedule.start_at ? new Date(schedule.start_at).getTime() : null;

      if (endAt && now >= endAt && session.status !== "complete") {
        transitionRef.current = true;
        const endedAt = new Date().toISOString();
        const { error } = await supabase
          .from("sessions")
          .update({ status: "complete", ended_at: endedAt })
          .neq("status", "complete")
          .eq("id", session.id);
        transitionRef.current = false;
        if (!error) {
          setSession((prev) => (prev ? { ...prev, status: "complete" } : prev));
          setCurrentStep(7);
        }
        return;
      }

      if (startAt && now >= startAt && session.status === "lobby") {
        transitionRef.current = true;
        const startedAt = new Date().toISOString();
        const { error } = await supabase
          .from("sessions")
          .update({ status: "running", current_step: 1, started_at: startedAt })
          .eq("status", "lobby")
          .eq("id", session.id);
        transitionRef.current = false;
        if (!error) {
          setSession((prev) => (prev ? { ...prev, status: "running", current_step: 1 } : prev));
          if (currentStepRef.current === 0) setCurrentStep(1);
        }
      }
    };

    void syncScheduledStatus();

    const schedule = getSimulationSessionSchedule(session.simulation.preferences);
    const futureEvents = [schedule.start_at, schedule.end_at]
      .map((value) => (value ? new Date(value).getTime() : null))
      .filter((value): value is number => value !== null && value > Date.now());

    if (futureEvents.length === 0) return;

    const timeout = window.setTimeout(() => {
      void syncScheduledStatus();
    }, Math.max(250, Math.min(...futureEvents) - Date.now() + 250));

    return () => window.clearTimeout(timeout);
  }, [session]);

  async function fetchPlaySessionPayload(targetParticipantId?: string): Promise<PlaySessionPayload> {
    const params = new URLSearchParams();
    if (targetParticipantId) {
      params.set("participantId", targetParticipantId);
    }
    if (isStudentPortal) {
      params.set("mode", "simulation");
    }
    const response = await fetch(`/api/play/session/${code.toUpperCase()}${params.size ? `?${params.toString()}` : ""}`);
    const result = (await response.json().catch(() => null)) as PlaySessionPayload | { error?: string } | null;
    if (!response.ok || !result || !("session" in result)) {
      const error = new Error(result && "error" in result ? result.error : "Session not found") as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }
    return result;
  }

  function buildParticipantResponses(payload: PlaySessionPayload) {
    return (payload.responses ?? []).map((r) => {
      const decision = payload.decisions.find((d) => d.id === r.decision_id);
      const option = decision?.options.find((o: Option) => o.id === r.option_id);
      return { decision_id: r.decision_id, option_id: r.option_id, score: option?.score || 0 };
    });
  }

  function resolveParticipantTeamState(payload: PlaySessionPayload, fallbackParticipantId?: string | null) {
    const targetParticipantId = payload.participant?.id ?? fallbackParticipantId ?? null;
    const teamMembers = Array.isArray(payload.team?.members) ? payload.team.members : [];
    const matchingMember = targetParticipantId
      ? teamMembers.find((member) => member.id === targetParticipantId) ?? null
      : null;

    return {
      teamId: payload.participant?.team_id ?? payload.team?.id ?? matchingMember?.team_id ?? null,
      isVoter: payload.participant?.is_voter ?? matchingMember?.is_voter ?? false,
    };
  }

  function hasCompletedSimulation(payload: PlaySessionPayload) {
    if (payload.session.status === "complete") return true;
    const storedComplete =
      typeof window !== "undefined" &&
      payload.participant &&
      sessionStorage.getItem(
        `simulation_completed_${payload.session.id}_${payload.participant.id}`,
      ) === "1";
    if (storedComplete) return true;
    if (payload.reflectionQuestions.length === 0) return false;
    const answeredReflectionIds = new Set(payload.reflectionResponseQuestionIds);
    return payload.reflectionQuestions.every((question) =>
      answeredReflectionIds.has(question.id),
    );
  }

  function getStepForPayload(payload: PlaySessionPayload) {
    if (payload.session.status === "lobby") return 0;
    if (hasCompletedSimulation(payload)) return 7;

    const answeredCount = payload.responses?.length || 0;
    if (answeredCount === 0) return 1;
    const votesEnabled = getSimulationFlowSettings(
      payload.session.simulation.preferences,
    ).classVotesEnabled;
    const lastAnsweredDecision = payload.decisions[answeredCount - 1];
    const votesSeen =
      !lastAnsweredDecision ||
      (typeof window !== "undefined" &&
        sessionStorage.getItem(
          `class_votes_seen_${payload.session.id}_${lastAnsweredDecision.id}`,
        ) === "1");
    if (votesEnabled && !votesSeen) return 5;
    if (answeredCount < payload.decisions.length) return answeredCount + 2;
    return 6;
  }

  function getPendingClassVotesDecisionIndex(payload: PlaySessionPayload) {
    if (
      hasCompletedSimulation(payload) ||
      !getSimulationFlowSettings(payload.session.simulation.preferences).classVotesEnabled ||
      payload.responses.length === 0
    ) {
      return null;
    }
    const index = Math.min(payload.responses.length - 1, payload.decisions.length - 1);
    const decision = payload.decisions[index];
    if (!decision || typeof window === "undefined") return null;
    return sessionStorage.getItem(`class_votes_seen_${payload.session.id}_${decision.id}`) === "1"
      ? null
      : index;
  }

  // Redirect to role selection
  useEffect(() => {
    if (!session || currentStep !== 1 || !participantId || availableProfiles.length === 0) return;
    const roleSelected = searchParams.get("roleSelected") === "1";
    const storedRole = sessionStorage.getItem(`role_${code.toUpperCase()}`);
    if (!roleSelected && !storedRole && !playerProfile) {
      router.replace(`/play/${code}/role-select`);
    }
  }, [session, currentStep, participantId, playerProfile, availableProfiles.length, code, router, searchParams]);

  useEffect(() => {
    const role = sessionStorage.getItem(`role_${code.toUpperCase()}`);
    const storedRoleLabel = sessionStorage.getItem(`role_label_${code.toUpperCase()}`);
    const labels: Record<string, string> = {
      marketing_lead: "Marketing Lead",
      cfo: "CFO",
      customer_rep: "Customer Rep",
    };
    setSelectedRoleLabel(
      playerProfile?.profile_name || storedRoleLabel || (role ? labels[role] : null) || "Decision maker",
    );
  }, [code, playerProfile]);

  // Fetch hidden profile when transitioning to background
  useEffect(() => {
    if (currentStep !== 1 || playerProfile || !participantId || !session?.simulation?.hidden_profiles_enabled) return;
    void (async () => {
      try {
        const payload = await fetchPlaySessionPayload(participantId);
        if (payload.playerProfile) {
          setPlayerProfile(payload.playerProfile);
        }
      } catch {
        /* keep silent */
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, participantId, playerProfile, session?.simulation?.hidden_profiles_enabled]);

  // Polling fallback
  useEffect(() => {
    if (!session) return;

    const supabase = createClient();
    const pollInterval = currentStep === 0 ? 2000 : 5000;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("sessions")
        .select("status")
        .eq("id", session.id)
        .single();

      if (data?.status === "running" && currentStepRef.current === 0) {
        setCurrentStep(1);
      }
      if (data?.status === "complete" && currentStepRef.current !== 7) {
        setCurrentStep(7);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [session, currentStep]);

  async function loadSession() {
    let initialPayload: PlaySessionPayload;
    try {
      initialPayload = await fetchPlaySessionPayload();
    } catch {
      toast.error("Session not found");
      router.push("/join");
      return;
    }

    const urlParticipantId = searchParams.get("participantId");
    const urlParticipantName = searchParams.get("participantName");
    const initialSession = initialPayload.session;

    const {
      data: { user },
    } = await createClient().auth.getUser();
    const storedOwnerId = sessionStorage.getItem(`participant_owner_${initialSession.id}`);
    const canUseStoredParticipant =
      !storedOwnerId || storedOwnerId === user?.id;
    if (!canUseStoredParticipant) {
      sessionStorage.removeItem(`participant_${initialSession.id}`);
      sessionStorage.removeItem(`participant_name_${initialSession.id}`);
      sessionStorage.removeItem(`participant_owner_${initialSession.id}`);
      sessionStorage.removeItem(`student_attempt_${initialSession.id}`);
      sessionStorage.removeItem(`participant_code_${code.toUpperCase()}`);
    }

    let storedParticipantId =
      (canUseStoredParticipant
        ? sessionStorage.getItem(`participant_${initialSession.id}`)
        : null) ||
      (!user && !storedOwnerId && localStorage.getItem("praxis_active_session_code") === code.toUpperCase()
        ? localStorage.getItem("praxis_guest_participant_id")
        : null);
    let storedName = canUseStoredParticipant
      ? sessionStorage.getItem(`participant_name_${initialSession.id}`)
      : null;

    if (storedParticipantId) {
      sessionStorage.setItem(`participant_${initialSession.id}`, storedParticipantId);
      sessionStorage.setItem(`participant_code_${code.toUpperCase()}`, storedParticipantId);
    }

    if (!user && urlParticipantId && urlParticipantName) {
      sessionStorage.setItem(`participant_${initialSession.id}`, urlParticipantId);
      sessionStorage.setItem(`participant_name_${initialSession.id}`, urlParticipantName);
      storedParticipantId = urlParticipantId;
      storedName = urlParticipantName;
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/play/${code}`);
      }
    }

    if (!storedParticipantId) {
      router.push(`/join?code=${code}`);
      return;
    }

    let payload: PlaySessionPayload;
    try {
      payload = await fetchPlaySessionPayload(storedParticipantId);
    } catch (error) {
      sessionStorage.removeItem(`participant_${initialSession.id}`);
      sessionStorage.removeItem(`participant_name_${initialSession.id}`);
      sessionStorage.removeItem(`participant_owner_${initialSession.id}`);
      sessionStorage.removeItem(`student_attempt_${initialSession.id}`);
      sessionStorage.removeItem(`participant_code_${code.toUpperCase()}`);
      if (
        (error as Error & { status?: number }).status === 403 &&
        localStorage.getItem("praxis_active_session_code") === code.toUpperCase()
      ) {
        localStorage.removeItem("praxis_active_session_code");
        localStorage.removeItem("praxis_guest_participant_id");
      }
      router.push(`/join?code=${code}`);
      return;
    }

    const existingParticipant = payload.participant;
    if (!existingParticipant) {
      sessionStorage.removeItem(`participant_${initialSession.id}`);
      sessionStorage.removeItem(`participant_name_${initialSession.id}`);
      router.push(`/join?code=${code}`);
      return;
    }

    const sessionWithSimulation = payload.session;
    if (user) {
      sessionStorage.setItem(`participant_owner_${initialSession.id}`, user.id);
    }
    setSession(sessionWithSimulation);
    setParticipantCount(payload.participantCount ?? 0);
    setStudentAttemptSource(payload.studentAttemptSource ?? null);
    setParticipantId(storedParticipantId);
    setParticipantName(existingParticipant.name || storedName || "");
    const participantTeamState = resolveParticipantTeamState(payload, storedParticipantId);
    setTeamId(participantTeamState.teamId);
    setTeamName(payload.team?.name ?? null);
    setTeamDecisions(payload.teamDecisions ?? []);
    setIsTeamVoter(participantTeamState.isVoter);
    setPlayerProfile(payload.playerProfile);
    setAvailableProfiles(payload.availableProfiles ?? []);
    setClassVotes(payload.classVotes ?? null);
    setSubmissionStatus(payload.submissionStatus ?? null);
    setDecisions(payload.decisions);
    setReflectionQuestions(payload.reflectionQuestions);
    setDataBlocks(payload.dataBlocks);
    setSources(payload.sources);
    setScenarioImages(payload.scenarioImages);

    setMyResponses(buildParticipantResponses(payload));
    const pendingVoteIndex = getPendingClassVotesDecisionIndex(payload);
    setClassVotesDecisionIndex(pendingVoteIndex);
    setCurrentStep(pendingVoteIndex === null ? getStepForPayload(payload) : 5);

    const storedAttemptId = sessionStorage.getItem(`student_attempt_${initialSession.id}`);
    if (storedAttemptId) {
      setStudentAttemptId(storedAttemptId);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!participantId || !session) return;
    const interval = window.setInterval(async () => {
      try {
        const payload = await fetchPlaySessionPayload(participantId);
        setSession(payload.session);
        setParticipantCount(payload.participantCount ?? 0);
        setClassVotes(payload.classVotes ?? null);
        setSubmissionStatus(payload.submissionStatus ?? null);
        setDecisions(payload.decisions);
        if (payload.session.status === "lobby") setCurrentStep(0);
        if (payload.session.status === "complete") setCurrentStep(7);
      } catch {
        /* keep current state */
      }
    }, getSimulationFlowSettings(session.simulation.preferences).classVotesEnabled ? 5_000 : 30_000);
    return () => window.clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId, session?.id, showConsequence]);

  useEffect(() => {
    if (!showConsequence || currentStep < 2 || currentStep > 4) return;
    const decision = decisions[currentStep - 2];
    const response = decision
      ? myResponses.find((item) => item.decision_id === decision.id)
      : null;
    const liveOption = decision?.options.find((option) => option.id === response?.option_id);
    const snapshot = decision ? decisionOutcomeSnapshots[decision.id] : null;
    if (snapshot) {
      setCurrentConsequence(snapshot.consequence);
      setCurrentDataImpact(snapshot.dataImpact);
      setOutcomeTier(snapshot.tier);
      setOutcomeReasoning(snapshot.outcomeReasoning);
      return;
    }
    if (liveOption?.consequence?.trim()) {
      setCurrentConsequence(liveOption.consequence);
    }
    if (liveOption) {
      setOutcomeTier(optionScoreToTier(liveOption.score));
    }
  }, [currentStep, decisionOutcomeSnapshots, decisions, myResponses, showConsequence]);

  useEffect(() => {
    if (session?.simulation.mode !== "teams" || currentStep < 2 || currentStep > 4) return;
    const decision = decisions[currentStep - 2];
    if (!decision) return;
    const teamChoice = teamDecisions.find((item) => item.decision_id === decision.id);
    if (teamChoice) {
      setSelectedOption(teamChoice.option_id);
    }
  }, [session?.simulation.mode, currentStep, decisions, teamDecisions]);

  useEffect(() => {
    if (!session || session.simulation.mode !== "teams" || !participantId || session.status !== "running") return;

    const interval = window.setInterval(async () => {
      try {
        const payload = await fetchPlaySessionPayload(participantId);
        const participantTeamState = resolveParticipantTeamState(payload, participantId);
        setParticipantCount(payload.participantCount ?? 0);
        setTeamId(participantTeamState.teamId);
        setTeamName(payload.team?.name ?? null);
        setTeamDecisions(payload.teamDecisions ?? []);
        setClassVotes(payload.classVotes ?? null);
        setSubmissionStatus(payload.submissionStatus ?? null);
        setIsTeamVoter(participantTeamState.isVoter);
        setMyResponses(buildParticipantResponses(payload));
        if (payload.session.status === "lobby") setCurrentStep(0);
        if (payload.session.status === "complete") setCurrentStep(7);
      } catch {
        /* keep current UI if refresh fails */
      }
    }, 3000);

    return () => window.clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.status, session?.simulation.mode, participantId, decisions]);

  const setVideoSelection = async (file: File) => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreviewUrl(previewUrl);
    setVideoError(null);

    const duration = await new Promise<number | null>((resolve) => {
      const element = document.createElement("video");
      element.preload = "metadata";
      element.onloadedmetadata = () => resolve(Math.round(element.duration) || null);
      element.onerror = () => resolve(null);
      element.src = previewUrl;
    });
    setVideoDurationSeconds(duration);
  };

  const handleVideoUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await setVideoSelection(file);
  };

  const clearVideoSelection = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    mediaChunksRef.current = [];
    recordingStartedAtRef.current = null;
    setRecording(false);
    if (liveVideoPreviewRef.current) {
      liveVideoPreviewRef.current.pause();
      liveVideoPreviewRef.current.srcObject = null;
    }
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDurationSeconds(null);
    setVideoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVideoError("Recording is not supported on this device. Upload a video instead.");
      return;
    }

    try {
      setPreparingRecorder(true);
      setVideoError(null);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setVideoFile(null);
      setVideoPreviewUrl(null);
      setVideoDurationSeconds(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      mediaChunksRef.current = [];

      const mimeType =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || "video/webm" });
        const extension = (blob.type.split("/")[1] || "webm").split(";")[0];
        const file = new File([blob], `video-justification-${Date.now()}.${extension}`, {
          type: blob.type || "video/webm",
        });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        await setVideoSelection(file);
      };
      recorder.start();
      recordingStartedAtRef.current = Date.now();
      setRecording(true);
    } catch (error) {
      logger.error("Video recording error:", error);
      setVideoError("Could not access camera/microphone. Upload a video instead.");
    } finally {
      setPreparingRecorder(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    const elapsed = recordingStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000))
      : null;
    setVideoDurationSeconds(elapsed);
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const justificationType = session?.simulation.justification_type ?? "written";
  const canChooseResponseInput =
    session?.simulation.mode === "individual" && justificationType === "video_or_text";
  const isVideoJustification =
    session?.simulation.mode === "individual" &&
    (justificationType === "video" ||
      (justificationType === "video_or_text" && responseInputMode === "video"));
  const requiresTextJustification =
    session?.simulation.mode !== "individual" ||
    justificationType === "written" ||
    (justificationType === "video_or_text" && responseInputMode === "text");

  const submitDecision = async () => {
    if (!selectedOption || !session || !participantId) return;
    const trimmedJustification = justification.trim();

    if (requiresTextJustification && !trimmedJustification) {
      toast.error("Please add a justification before continuing.");
      return;
    }
    if (isVideoJustification && !videoFile) {
      toast.error("Please record or upload a video before continuing.");
      return;
    }
    setSubmitting(true);

    const decisionIndex = currentStep - 2;
    const decision = decisions[decisionIndex];
    let chosenOptionId = selectedOption;
    let option = decision.options.find(o => o.id === chosenOptionId);
    const existingTeamDecision =
      session.simulation.mode === "teams"
        ? teamDecisions.find((item) => item.decision_id === decision.id)
        : null;

    if (!session.is_preview) {
      const supabase = createClient();
      if (session.simulation.mode === "teams") {
        if (!teamId) {
          toast.error("Your team assignment is missing.");
          setSubmitting(false);
          return;
        }

        if (!existingTeamDecision) {
          if (!isTeamVoter) {
            toast.error("Waiting for your team voter to choose an option.");
            setSubmitting(false);
            return;
          }

          const { data: createdTeamDecision, error: teamDecisionError } = await supabase
            .from("team_decision_submissions")
            .insert({
              session_id: session.id,
              team_id: teamId,
              decision_id: decision.id,
              option_id: selectedOption,
              submitted_by_participant_id: participantId,
            })
            .select("id, team_id, decision_id, option_id, submitted_at")
            .single();

          if (teamDecisionError || !createdTeamDecision) {
            toast.error("Failed to save team choice");
            setSubmitting(false);
            return;
          }

          setTeamDecisions((prev) => [...prev, createdTeamDecision]);
          chosenOptionId = createdTeamDecision.option_id;
          option = decision.options.find((o) => o.id === chosenOptionId);
        } else {
          chosenOptionId = existingTeamDecision.option_id;
          option = decision.options.find((o) => o.id === chosenOptionId);
        }

        const { error } = await supabase
          .from("responses")
          .insert({
            session_id: session.id,
            participant_id: participantId,
            team_id: teamId,
            decision_id: decision.id,
            option_id: chosenOptionId,
            justification: trimmedJustification,
          });

        if (error) {
          toast.error(error.code === "23505" ? "You have already submitted this response" : "Failed to submit justification");
          setSubmitting(false);
          return;
        }
      } else if (isVideoJustification && videoFile) {
        const { data: responseRow, error: responseError } = await supabase
          .from("responses")
          .insert({
            session_id: session.id,
            participant_id: participantId,
            decision_id: decision.id,
            option_id: chosenOptionId,
            justification: canChooseResponseInput && responseInputMode === "video" ? null : trimmedJustification || null,
          })
          .select("id")
          .single();

        if (responseError || !responseRow) {
          toast.error(responseError?.code === "23505" ? "You have already submitted this response" : "Failed to submit response");
          setSubmitting(false);
          return;
        }

        const extension = videoFile.name.split(".").pop() || "webm";
        const storagePath = `${session.simulation.id}/${session.id}/${decision.id}/${participantId}/${responseRow.id}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("response-videos")
          .upload(storagePath, videoFile, {
            contentType: videoFile.type || "video/webm",
            upsert: false,
          });

        if (uploadError) {
          await supabase.from("responses").delete().eq("id", responseRow.id);
          toast.error("Failed to upload video response");
          setSubmitting(false);
          return;
        }

        const { error: responseVideoError } = await supabase.from("response_videos").insert({
          response_id: responseRow.id,
          session_id: session.id,
          simulation_id: session.simulation.id,
          decision_id: decision.id,
          option_id: chosenOptionId,
          participant_id: participantId,
          storage_path: storagePath,
          mime_type: videoFile.type || "video/webm",
          file_size_bytes: videoFile.size,
          duration_seconds: videoDurationSeconds,
        });

        if (responseVideoError) {
          await supabase.storage.from("response-videos").remove([storagePath]);
          await supabase.from("responses").delete().eq("id", responseRow.id);
          toast.error("Failed to save video response");
          setSubmitting(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from("responses")
          .insert({
            session_id: session.id,
            participant_id: participantId,
            decision_id: decision.id,
            option_id: chosenOptionId,
            justification: trimmedJustification,
          });

        if (error) {
          toast.error(error.code === "23505" ? "You have already submitted this response" : "Failed to submit response");
          setSubmitting(false);
          return;
        }
      }
    }

    setMyResponses(prev => [...prev, { 
      decision_id: decision.id, 
      option_id: chosenOptionId, 
      score: option?.score || 0 
    }]);

    const calculatedImpact = option
      ? calculateQualitativeImpact(
          option,
          `${session.simulation.title} ${session.simulation.background_content ?? ""} ${decision.prompt}`,
        )
      : [];
    setCurrentDataImpact(calculatedImpact);
    const selectedTier = optionScoreToTier(option?.score);
    setOutcomeTier(selectedTier);

    // Wait for the scenario-specific result before showing the consequence.
    // This avoids briefly rendering a generic result and replacing it seconds later.
    try {
      const response = await fetch("/api/generate-consequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioTitle: session.simulation.title,
          scenarioContext: session.simulation.background_content,
          decisionPrompt: decision.prompt,
          optionLabel: option?.label,
          optionTitle: option?.title,
          optionDescription: option?.description,
          justification: trimmedJustification,
          roleLabel: selectedRoleLabel,
        }),
      });
      const data = await response.json();
      const resolvedConsequence =
        option?.consequence?.trim() ||
          (typeof data.consequence === "string" ? data.consequence.trim() : "") ||
          "Your choice has been recorded. The consequences of your decision are outlined below.";
      const resolvedOutcomeReasoning =
        typeof data.outcomeReasoning === "string" ? data.outcomeReasoning.trim() : "";
      const resolvedImpact =
        Array.isArray(data.impacts) && data.impacts.length === 4
          ? (data.impacts as QualitativeImpact[])
          : calculatedImpact;
      const outcomeSnapshot: DecisionOutcomeSnapshot = {
        consequence: resolvedConsequence,
        outcomeReasoning: resolvedOutcomeReasoning,
        dataImpact: resolvedImpact,
        tier: selectedTier,
      };
      persistDecisionOutcome(decision.id, outcomeSnapshot);
      setCurrentConsequence(resolvedConsequence);
      setOutcomeReasoning(resolvedOutcomeReasoning);
      setCurrentDataImpact(resolvedImpact);
      if (data.feedback) setAiJustificationFeedback(data.feedback);
    } catch {
      const resolvedConsequence =
        option?.consequence?.trim() ||
          "Your choice has been recorded. The consequences of your decision are outlined below.";
      persistDecisionOutcome(decision.id, {
        consequence: resolvedConsequence,
        outcomeReasoning: "",
        dataImpact: calculatedImpact,
        tier: selectedTier,
      });
      setCurrentConsequence(resolvedConsequence);
    } finally {
      setShowConsequence(true);
      setSubmitting(false);
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("praxis:decision-consequence", {
            detail: {
              decisionId: decision.id,
              isFinal: decision.order_num === decisions.length,
            },
          }),
        );
      }, 0);
    }
  };

  const continueToNext = async () => {
    const completedDecisionIndex = currentStep - 2;
    if (
      completedDecisionIndex >= 0 &&
      getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled
    ) {
      setClassVotesDecisionIndex(completedDecisionIndex);
      setShowConsequence(false);
      // Set step to 5 immediately to avoid flashing the decision screen
      // while the async fetch completes
      setCurrentStep(5);
      if (participantId) {
        try {
          const payload = await fetchPlaySessionPayload(participantId);
          setClassVotes(payload.classVotes ?? null);
          setSubmissionStatus(payload.submissionStatus ?? null);
          setMyResponses(buildParticipantResponses(payload));
        } catch {
          /* the live poll will retry */
        }
      }
      return;
    }

    setShowConsequence(false);
    setSelectedOption(null);
    setJustification("");
    setResponseInputMode("text");
    clearVideoSelection();
    setCurrentConsequence("");
    setCurrentDataImpact(undefined);
    setOutcomeTier(null);
    setOutcomeReasoning("");
    setAiJustificationFeedback(null);

    if (participantId) {
      try {
        const payload = await fetchPlaySessionPayload(participantId);
        const participantTeamState = resolveParticipantTeamState(payload, participantId);
        setParticipantCount(payload.participantCount ?? 0);
        setTeamId(participantTeamState.teamId);
        setTeamName(payload.team?.name ?? null);
        setTeamDecisions(payload.teamDecisions ?? []);
        setClassVotes(payload.classVotes ?? null);
        setSubmissionStatus(payload.submissionStatus ?? null);
        setIsTeamVoter(participantTeamState.isVoter);
        setMyResponses(buildParticipantResponses(payload));
        setCurrentStep(completedDecisionIndex >= decisions.length - 1 ? 6 : currentStep + 1);
        return;
      } catch {
        /* fall back to local step advance below */
      }
    }

    setCurrentStep((prev) => (completedDecisionIndex >= decisions.length - 1 ? 6 : prev + 1));
  };

  const submitReflection = async () => {
    if (!session || !participantId) return;
    setSubmitting(true);

    if (!session.is_preview) {
      const supabase = createClient();
      const { data: existingResponses, error: existingResponsesError } = await supabase
        .from("reflection_responses")
        .select("question_id")
        .eq("session_id", session.id)
        .eq("participant_id", participantId);
      if (existingResponsesError) {
        toast.error("Could not save your reflection. Please try again.");
        setSubmitting(false);
        return;
      }
      const existingQuestionIds = new Set(
        (existingResponses ?? []).map((response) => response.question_id),
      );
      const newResponses = reflectionQuestions.flatMap((question) => {
        const answer = reflectionAnswers[question.id]?.trim();
        return answer && !existingQuestionIds.has(question.id)
          ? [{
              session_id: session.id,
              participant_id: participantId,
              team_id: teamId,
              question_id: question.id,
              response: answer,
            }]
          : [];
      });
      if (newResponses.length > 0) {
        const { error: reflectionError } = await supabase
          .from("reflection_responses")
          .insert(newResponses);
        if (reflectionError) {
          toast.error("Could not save your reflection. Please try again.");
          setSubmitting(false);
          return;
        }
      }
    }

    const totalScore = myResponses.reduce((sum, r) => sum + r.score, 0);
    const maxScore = decisions.length * 3;

    if (studentAttemptId) {
      try {
        const response = await fetch("/api/student/attempts/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: studentAttemptId,
            totalScore,
            maxScore,
          }),
        });
        const result = (await response.json().catch(() => null)) as
          | { attemptId: string; score: number }
          | { error?: string }
          | null;
        if (response.ok && result && "attemptId" in result) {
          setCompletedReportId(result.attemptId);
          sessionStorage.removeItem(`student_attempt_${session.id}`);
        }
      } catch {
        /* results screen still shows local score */
      }
    }

    sessionStorage.setItem(
      `simulation_completed_${session.id}_${participantId}`,
      "1",
    );
    setCurrentStep(7);
    setSubmitting(false);
  };

  const manualRefreshSession = async () => {
    if (!session) return;
    setManualRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("status")
      .eq("id", session.id)
      .single();

    if (data?.status === "running" && currentStep === 0) {
      setCurrentStep(1);
    } else if (data?.status === "complete") {
      setCurrentStep(7);
    }
    setManualRefreshing(false);
  };

  const currentTeamDecision =
    session?.simulation.mode === "teams" && currentStep >= 2 && currentStep <= 4
      ? teamDecisions.find((item) => item.decision_id === decisions[currentStep - 2]?.id)
      : null;
  const waitingForTeamChoice = session?.simulation.mode === "teams" && !currentTeamDecision;
  const canSelectTeamChoice = Boolean(session?.simulation.mode === "teams" && isTeamVoter && !currentTeamDecision);
  const activeTeamName = teamName || "Your team";
  const submitButtonLabel =
    session?.simulation.mode === "teams"
      ? currentTeamDecision
        ? "Submit Justification"
        : "Submit Team Choice & Justification"
      : "Submit Decision";

  const handleLeaveStudentView = async () => {
    if (!session?.is_preview) return;
    setLeavingPreview(true);
    const result = await endPreviewSession(session.id);
    if ("error" in result) {
      logger.warn(result.error);
    }
    sessionStorage.removeItem(`participant_${session.id}`);
    sessionStorage.removeItem(`participant_name_${session.id}`);
    sessionStorage.removeItem(`participant_owner_${session.id}`);
    router.push(`/edit/${session.simulation.id}`);
  };

  const finalFlowSettings = getSimulationFlowSettings(
    session?.simulation.preferences,
    session?.student_flow_settings,
  );
  const canViewPodium = finalFlowSettings.leaderboardEnabled;

  const outcomeLabel = outcomeTier ? `${outcomeTier} Outcome` : null;
  const outcomeTierStyle = outcomeTier
    ? OUTCOME_TIER_STYLES[outcomeTier]
    : OUTCOME_TIER_STYLES.Decent;
  const completionScore = myResponses.reduce((total, response) => total + response.score, 0);
  const completionScoreMax = decisions.reduce(
    (total, decision) =>
      total + Math.max(0, ...decision.options.map((option) => option.score)),
    0,
  );
  const isStudentPortal = studentAttemptSource === "explore";
  const votesTitle = isStudentPortal ? "Student Votes" : "Class Votes";
  const votesDescription = isStudentPortal
    ? "See how students voted on this decision across everyone who has done this simulation."
    : "See how your class voted on this decision.";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const showPreviewBar = Boolean(session?.is_preview);
  const previewBar = showPreviewBar ? (
    <header className="safe-area-inset-top flex shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur-sm">
      <span className="truncate text-xs text-muted-foreground sm:text-sm">Student preview</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-10 shrink-0"
        disabled={leavingPreview}
        onClick={() => void handleLeaveStudentView()}
      >
        {leavingPreview ? (
          <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <LogOut className="mr-2 h-4 w-4 shrink-0" />
        )}
        Leave student view
      </Button>
    </header>
  ) : null;

  // Waiting screen
  if (currentStep === 0) {
    return (
      <div className="flex min-h-dvh flex-col">
        {previewBar}
        <div data-simulation-scroll-container className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="flex flex-1 items-center justify-center px-4 py-6">
            <Card className="w-full max-w-md text-center">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <BookOpen className="h-8 w-8 text-primary shrink-0" />
                </div>
                <CardTitle className="text-lg sm:text-xl line-clamp-2">{session?.simulation.title}</CardTitle>
                <CardDescription>Welcome, {participantName}!</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-3 text-center">
                  <p className="font-medium text-foreground">You&apos;re in.</p>
                  {session?.simulation.mode === "teams" ? (
                    <p className="text-sm text-muted-foreground">
                      {teamName ? `${teamName} · ` : ""}
                      {isTeamVoter ? "You are the team voter." : "A teammate will make the team choice."}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-sm sm:text-base">
                    {participantCount <= 1
                      ? "Waiting for the instructor to start."
                      : `${participantCount} students joined. Waiting for the instructor to start.`}
                  </p>
                  {(scheduledStartLabel || scheduledEndLabel) && (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {scheduledStartLabel ? <p>Scheduled start: {scheduledStartLabel}</p> : null}
                      {scheduledEndLabel ? <p>Scheduled end: {scheduledEndLabel}</p> : null}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                    <Clock className="h-4 w-4 animate-pulse shrink-0" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={manualRefreshSession}
                    disabled={manualRefreshing}
                    className="mt-3 text-muted-foreground"
                  >
                    <RefreshCw className={`mr-2 h-3.5 w-3.5 ${manualRefreshing ? "animate-spin" : ""}`} />
                    {manualRefreshing ? "Checking..." : "Refresh status"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Background screen
  if (currentStep === 1) {
    return (
      <div className="flex min-h-dvh flex-col">
        {previewBar}
        <div data-simulation-scroll-container className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="px-3 py-4 sm:px-4 sm:py-8">
            <div className="max-w-5xl mx-auto space-y-4">
              <SimulationTopHeader
                decisionCount={decisions.length}
                activeStage="background"
                roleLabel={selectedRoleLabel}
              />
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <Badge className="w-fit mb-2">Background</Badge>
                  <CardTitle className="text-lg sm:text-xl line-clamp-2">{session?.simulation.title}</CardTitle>
                  <CardDescription className="text-sm">
                    Read the scenario carefully before making decisions.
                    {session?.simulation.estimated_minutes ? (
                      <span className="block mt-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 inline mr-1" />
                        Est. ~{session.simulation.estimated_minutes} min
                      </span>
                    ) : null}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  {playerProfile && (
                    <div className="mb-6 border-l-4 border-primary rounded-lg bg-primary/5 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge>Your Role: {playerProfile.profile_name}</Badge>
                      </div>
                      <MarkdownBody className="prose prose-sm max-w-none text-sm">
                        {playerProfile.private_briefing}
                      </MarkdownBody>
                      <p className="text-[11px] text-muted-foreground italic">
                        This briefing is private to your role. Other participants have different information.
                      </p>
                    </div>
                  )}
                  {scenarioImages.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {scenarioImages.map((im) => {
                        const src = publicScenarioImageUrl(im.storage_path);
                        if (!src) return null;
                        return (
                          <figure key={im.id} className="overflow-hidden rounded-lg border border-border bg-muted/30">
                            <Image
                              src={src}
                              alt={im.alt_text || "Scenario image"}
                              width={1600}
                              height={1200}
                              className="max-h-72 w-full object-cover"
                            />
                            {im.alt_text ? (
                              <figcaption className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                                {im.alt_text}
                              </figcaption>
                            ) : null}
                          </figure>
                        );
                      })}
                    </div>
                  )}
                  {session?.simulation.background_content ? (
                    <MarkdownBody className="prose prose-sm max-w-none text-sm sm:text-base prose-table:overflow-x-auto prose-td:border prose-td:px-3 prose-td:py-2 prose-th:border prose-th:px-3 prose-th:py-2 prose-th:bg-muted/50">
                      {session.simulation.background_content}
                    </MarkdownBody>
                  ) : (
                    <p className="text-muted-foreground">No background content provided.</p>
                  )}
                  {dataBlocks.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {dataBlocks.map((block) => (
                        <DataBlockRenderer
                          key={block.id}
                          block={block as Parameters<typeof DataBlockRenderer>[0]["block"]}
                        />
                      ))}
                    </div>
                  )}
                  {sources.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <h4 className="text-sm font-semibold text-foreground mb-3">
                        Sources & References
                      </h4>
                      <ol className="space-y-2 list-none pl-0">
                        {sources.map((s, idx) => {
                          const typeLabel = sourceTypeDisplayLabel(s.source_type);
                          return (
                            <li key={s.id} className="flex items-start gap-2.5 text-sm leading-relaxed">
                              <span className="shrink-0 mt-0.5 text-xs font-medium text-muted-foreground tabular-nums w-5 text-right">{idx + 1}.</span>
                              {typeLabel && (
                                <span className="shrink-0 mt-0.5 inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  {typeLabel}
                                </span>
                              )}
                              <span className="min-w-0">
                                {s.url ? (
                                  <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-2 text-foreground/90 hover:text-foreground"
                                  >
                                    {s.label}
                                  </a>
                                ) : (
                                  <span className="text-foreground/90">{s.label}</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                  <Separator className="my-4 sm:my-6" />
                  <div className="flex justify-end">
                    {returnToStep != null ? (
                      <Button
                        onClick={() => {
                          setCurrentStep(returnToStep);
                          setReturnToStep(null);
                          if (returnToConsequence) setShowConsequence(true);
                          setReturnToConsequence(false);
                        }}
                        variant="outline"
                        className="min-h-[48px] w-full sm:w-auto"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                        {returnToStep >= 2 && returnToStep <= 4
                          ? `Back to Decision ${returnToStep - 1}`
                          : returnToStep === 6
                            ? "Back to Reflection"
                            : "Back"}
                      </Button>
                    ) : (
                      <Button onClick={() => setCurrentStep(2)} className="min-h-[48px] w-full sm:w-auto">
                        Continue to Decisions
                        <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const goToScenario = (fromStep: number, fromConsequence: boolean) => {
    setReturnToStep(fromStep);
    setReturnToConsequence(fromConsequence);
    setCurrentStep(1);
  };

  // Decision screens (steps 2, 3, 4)
  if (currentStep >= 2 && currentStep <= 4) {
    const decisionIndex = currentStep - 2;
    const decision = decisions[decisionIndex];

    if (!decision) {
      setCurrentStep(5);
      return null;
    }

    const canShowClassProgress =
      getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled &&
      getSimulationFlowSettings(session?.simulation.preferences).showVoteSubmissionStatus &&
      studentAttemptSource !== "explore" &&
      submissionStatus?.decisionId === decision.id;
    const classProgressPercent = canShowClassProgress && submissionStatus && submissionStatus.eligible > 0
      ? Math.round((submissionStatus.submitted / submissionStatus.eligible) * 100)
      : 0;

    // Show consequence after submission
    if (showConsequence) {
      return (
        <div className="flex min-h-dvh flex-col">
          {previewBar}
          <div data-simulation-scroll-container className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
            <div className="px-3 py-4 sm:px-4 sm:py-8">
              <div className="max-w-5xl mx-auto space-y-4">
                <SimulationTopHeader
                  decisionCount={decisions.length}
                  activeStage={`decision-${decision.order_num}`}
                  roleLabel={selectedRoleLabel}
                />
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <Badge variant="secondary" className="mb-2 w-fit">Consequence</Badge>
                    <CardTitle className="text-xl sm:text-2xl">
                      Decision {decision.order_num} Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 space-y-4">
                    <div className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center ${outcomeTierStyle.container}`}>
                      <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${outcomeTierStyle.icon}`}>
                        <Star className="h-7 w-7 fill-current" />
                      </div>
                      <p className="min-w-0 flex-1 leading-relaxed text-foreground">
                        <strong className={outcomeTierStyle.label}>
                          {outcomeLabel ?? "Decision outcome"}:
                        </strong>{" "}
                        {currentConsequence || "Your choice has been recorded."}
                        {outcomeReasoning ? ` ${outcomeReasoning}` : ""}
                      </p>
                      {outcomeLabel ? (
                        <Badge className={`shrink-0 ${outcomeTierStyle.badge}`}>
                          {outcomeLabel}
                        </Badge>
                      ) : null}
                    </div>
                    {getSimulationFlowSettings(session?.simulation.preferences).impactMetricsEnabled &&
                    currentDataImpact && currentDataImpact.length > 0 ? (
                      <div className="rounded-2xl border bg-card px-4 sm:px-6">
                        <p className="py-4 font-bold">What happened as a result:</p>
                        <div>
                          {currentDataImpact.map((impact, index) => {
                            const financial = impact.direction === "cost";
                            const positive = impact.direction === "up";
                            const neutral = impact.direction === "neutral";
                            const Icon = financial
                              ? DollarSign
                              : positive
                                ? TrendingUp
                                : neutral
                                  ? Minus
                                  : TrendingDown;
                            const iconClass = financial
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : positive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : neutral
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
                            const titleClass = financial
                              ? "text-blue-700 dark:text-blue-300"
                              : positive
                                ? "text-emerald-700 dark:text-emerald-300"
                                : neutral
                                  ? "text-amber-700 dark:text-amber-300"
                                  : "text-red-700 dark:text-red-300";
                            const directionLabel = financial
                              ? "More Effort"
                              : positive
                                ? "Increased"
                                : neutral
                                  ? "Moderate"
                                  : "Decreased";
                            return (
                              <div
                                key={`${impact.label}-${index}`}
                                className="flex gap-4 border-t py-4 first:border-t-0"
                              >
                                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${iconClass}`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className={`font-bold capitalize ${titleClass}`}>
                                      {String.fromCharCode(65 + index)}. {impact.label}
                                    </p>
                                    <span className={`text-sm font-bold ${titleClass}`}>
                                      {directionLabel}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                                    {impact.description}
                                  </p>
                                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {impact.reason}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    {/* Live dashboard intentionally hidden for now. */}
                    {aiJustificationFeedback && (
                      <div className="rounded-xl border-l-4 border-primary bg-muted p-4">
                        <p className="text-sm font-semibold">Feedback on your reasoning</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{aiJustificationFeedback}</p>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={() => goToScenario(currentStep, true)}
                        className="w-full sm:w-auto min-h-[44px]"
                      >
                        <BookOpen className="mr-2 h-4 w-4 shrink-0" />
                        View scenario
                      </Button>
                      {session?.simulation.mode === "teams" && (
                        <Button
                          variant="secondary"
                          className="w-full sm:w-auto min-h-[44px]"
                          onClick={() => toast.info("Your instructor can now open this choice for class discussion.")}
                        >
                          Discuss with Class
                        </Button>
                      )}
                      <Button onClick={continueToNext} className="w-full sm:w-auto min-h-[48px]">
                        {getSimulationFlowSettings(session?.simulation.preferences)
                          .classVotesEnabled
                          ? `Proceed to ${votesTitle}`
                          : decisionIndex < decisions.length - 1
                            ? "Proceed to Next Decision"
                            : "Next: Reflection"}
                        <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-dvh flex-col bg-muted/50">
        {previewBar}
        <div data-simulation-scroll-container className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="px-3 py-4 sm:px-4 sm:py-6">
            <div className="mx-auto mb-3 max-w-5xl">
              <SimulationTopHeader
                decisionCount={decisions.length}
                activeStage={`decision-${decision.order_num}`}
                roleLabel={selectedRoleLabel}
              />
            </div>
            <div className="mx-auto max-w-5xl">
              <div className="overflow-hidden rounded-xl border border-[#fed7aa] bg-white shadow-[0_14px_35px_rgba(124,45,18,0.08)] dark:border-[#1f2937] dark:bg-[#111827]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#fee2d2] px-5 py-4 dark:border-[#1f2937] sm:px-6">
                  <Badge className="bg-[#fff7ed] px-2.5 py-1 text-xs font-medium text-[#c2410c] hover:bg-[#fff7ed] dark:bg-[#7c2d12]/40 dark:text-[#fdba74]">
                    Decision {decision.order_num} of {decisions.length}
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={() => goToScenario(currentStep, false)}
                    className="h-9 border-[#fed7aa] bg-white text-xs font-medium text-[#ea580c] hover:bg-[#fff7ed] hover:text-[#c2410c] dark:border-[#7c2d12] dark:bg-transparent dark:text-[#fb923c] dark:hover:bg-[#7c2d12]/30"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    View scenario
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="space-y-1.5">
                      <h2 className="max-w-2xl text-xl font-semibold leading-7 tracking-[-0.02em] text-[#111827] sm:text-2xl sm:leading-8 dark:text-[#f9fafb]">
                        {decision.prompt}
                      </h2>
                      <p className="text-sm leading-5 text-[#6b7280] dark:text-[#9ca3af]">
                        Consider the trade-offs and likely consequences before you decide.
                      </p>
                    </div>

                    {session?.simulation.mode === "teams" ? (
                      <div className="rounded-lg border border-[#fed7aa] bg-[#fffaf5] p-4 dark:border-[#374151] dark:bg-[#1f2937]">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{activeTeamName}</Badge>
                          <Badge variant={isTeamVoter ? "default" : "secondary"}>
                            {isTeamVoter ? "You are the voter" : "Non-voter"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {currentTeamDecision
                            ? "Your team choice is locked in. Add your own justification to continue."
                            : isTeamVoter
                              ? "Choose the option for your team. Every teammate still submits their own justification."
                              : "Waiting for your team voter to choose an option before you continue."}
                        </p>
                      </div>
                    ) : null}

                    <RadioGroup
                      value={selectedOption || ""}
                      onValueChange={(value) => {
                        if (session?.simulation.mode === "teams" && !canSelectTeamChoice) return;
                        setSelectedOption(value);
                      }}
                      className="gap-2.5"
                    >
                      {decision.options.map((option) => {
                        const isSelected = selectedOption === option.id;
                        const isDisabled = Boolean(session?.simulation.mode === "teams" && !canSelectTeamChoice);
                        return (
                          <div
                            key={option.id}
                            className={`rounded-lg border transition-all duration-150 ${
                              isSelected
                                ? "border-[#ea580c] bg-[#fff7ed] shadow-[0_0_0_1px_rgba(234,88,12,0.08)] dark:border-[#fb923c] dark:bg-[#7c2d12]/25"
                                : "border-[#fed7aa] bg-white hover:border-[#fb923c] hover:bg-[#fffaf5] dark:border-[#374151] dark:bg-[#111827] dark:hover:border-[#7c2d12] dark:hover:bg-[#1f2937]"
                            } ${isDisabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                            onClick={() => {
                              if (!isDisabled) setSelectedOption(option.id);
                            }}
                          >
                            <div className="flex items-start gap-3 p-3.5 sm:p-4">
                              <RadioGroupItem
                                value={option.id}
                                id={option.id}
                                disabled={isDisabled}
                                className="mt-1 border-[#fed7aa] text-[#ea580c] dark:border-[#4b5563] dark:text-[#fb923c]"
                              />
                              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm font-semibold ${
                                isSelected
                                  ? "bg-[#ea580c] text-white dark:bg-[#fb923c] dark:text-[#431407]"
                                  : "bg-[#fff7ed] text-[#c2410c] dark:bg-[#1f2937] dark:text-[#fdba74]"
                              }`}>
                                {option.label}
                              </span>
                              <div className="min-w-0 flex-1">
                                <Label htmlFor={option.id} className="cursor-pointer break-words text-sm font-semibold text-[#1f2937] dark:text-[#f3f4f6]">
                                  {option.title}
                                </Label>
                                {option.description ? (
                                  <p className="mt-0.5 text-xs leading-5 text-[#6b7280] dark:text-[#9ca3af]">
                                    {option.description}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>

                  <aside className="border-t border-[#fee2d2] bg-[#fffdfb] p-5 dark:border-[#1f2937] dark:bg-[#0f1720] sm:p-6 lg:border-l lg:border-t-0">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor="justification" className="text-sm font-medium text-[#374151] dark:text-[#e5e7eb]">
                            Explain your reasoning
                          </Label>
                        </div>
                        {session?.simulation.mode === "teams" && waitingForTeamChoice && !canSelectTeamChoice ? (
                          <p className="mt-3 text-sm leading-5 text-[#6b7280] dark:text-[#9ca3af]">
                            Waiting for your team voter to choose an option before you can submit your response.
                          </p>
                        ) : (
                          <>
                            {canChooseResponseInput ? (
                              <div className="mt-3 flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={responseInputMode === "text" ? "default" : "outline"}
                                  onClick={() => {
                                    setResponseInputMode("text");
                                    clearVideoSelection();
                                  }}
                                >
                                  Text
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={responseInputMode === "video" ? "default" : "outline"}
                                  onClick={() => {
                                    setResponseInputMode("video");
                                    setJustification("");
                                  }}
                                >
                                  Video
                                </Button>
                              </div>
                            ) : null}
                            {isVideoJustification ? (
                              <div className="mt-3 space-y-3">
                                <p className="text-sm leading-5 text-[#6b7280] dark:text-[#9ca3af]">
                                  Record or upload a short video explaining your reasoning before continuing.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {recording ? (
                                    <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
                                      <Square className="h-3.5 w-3.5" />
                                      Stop recording
                                    </Button>
                                  ) : (
                                    <Button type="button" size="sm" onClick={startRecording} disabled={preparingRecorder}>
                                      {preparingRecorder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-3.5 w-3.5" />}
                                      Record video
                                    </Button>
                                  )}
                                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={recording}>
                                    <Upload className="h-3.5 w-3.5" />
                                    Upload
                                  </Button>
                                </div>
                                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUploadChange} />
                                {recording ? (
                                  <video ref={liveVideoPreviewRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-black object-cover" />
                                ) : null}
                                {videoError ? <p className="text-xs text-destructive">{videoError}</p> : null}
                                {videoPreviewUrl ? (
                                  <div className="space-y-2">
                                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Video className="h-3.5 w-3.5" />{videoFile?.name}</p>
                                    <video key={videoPreviewUrl} controls preload="metadata" src={videoPreviewUrl} className="aspect-video w-full rounded-lg bg-black object-cover" />
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <>
                                <Textarea
                                  id="justification"
                                  placeholder="What trade-offs influenced your decision?"
                                  value={justification}
                                  onChange={(event) => setJustification(event.target.value.slice(0, 1000))}
                                  rows={5}
                                  maxLength={1000}
                                  className="mt-3 min-h-32 resize-none rounded-lg border-[#e5e7eb] bg-white text-sm text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#ea580c] focus-visible:ring-[#fed7aa] dark:border-[#374151] dark:bg-[#111827] dark:text-[#f9fafb]"
                                />
                                <p className="mt-1.5 text-xs tabular-nums text-[#6b7280] dark:text-[#9ca3af]">{justification.length} / 1000 characters</p>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      <p className="border-t border-[#fee2d2] pt-4 text-xs leading-5 text-[#6b7280] dark:border-[#1f2937] dark:text-[#9ca3af]">
                        Your response is anonymous to classmates, but your instructor can see it.
                      </p>

                      {canShowClassProgress && submissionStatus ? (
                        <div className="rounded-lg border border-[#fee2d2] bg-white p-3 dark:border-[#374151] dark:bg-[#111827]">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-medium text-[#374151] dark:text-[#e5e7eb]">Class progress</span>
                            <span className="tabular-nums text-[#6b7280] dark:text-[#9ca3af]">{submissionStatus.submitted} of {submissionStatus.eligible} students submitted</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e7eb] dark:bg-[#374151]">
                            <div className="h-full rounded-full bg-[#f97316] dark:bg-[#fb923c]" style={{ width: `${classProgressPercent}%` }} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </aside>
                </div>

                <div className="flex flex-col gap-3 border-t border-[#fee2d2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-[#1f2937]">
                  <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                    {selectedOption ? "Your choice is ready to submit." : "Select an option to continue."}
                  </p>
                  <Button
                    size="lg"
                    onClick={submitDecision}
                    disabled={
                      !selectedOption ||
                      (isVideoJustification ? !videoFile : !justification.trim()) ||
                      Boolean(session?.simulation.mode === "teams" && waitingForTeamChoice && !canSelectTeamChoice) ||
                      submitting
                    }
                    className="min-h-11 w-full rounded-lg bg-[#f97316] text-white shadow-sm hover:bg-[#ea580c] hover:text-white sm:w-auto dark:bg-[#fb923c] dark:text-[#431407] dark:hover:bg-[#f97316] dark:hover:text-white"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {submitButtonLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

    // Class Votes screen (optional step after every consequence)
  if (
    currentStep === 5 &&
    getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled
  ) {
    const decisionIndex = classVotesDecisionIndex ?? Math.max(0, myResponses.length - 1);
    const decision = decisions[decisionIndex];
    const voteData = classVotes?.decisionId === decision?.id ? classVotes : null;
    const myLastResponse = decision
      ? myResponses.find((response) => response.decision_id === decision.id)
      : null;
    const selectedOpt = decision?.options.find(o => o.id === myLastResponse?.option_id);
    const optionCounts = (decision?.options ?? []).map(
      (option) => voteData?.optionIds.filter((id) => id === option.id).length ?? 0,
    );
    const optionPercentages = roundedPercentages(optionCounts);
    const voteColors = ["#f45b0b", "#f5a623", "#ef5b6a", "#3b82f6"];
    let voteCursor = 0;
    const voteGradient = optionPercentages
      .map((percentage, index) => {
        const start = voteCursor;
        voteCursor += percentage;
        return `${voteColors[index % voteColors.length]} ${start}% ${voteCursor}%`;
      })
      .join(", ");
    const totalSubmitted = voteData?.totalSubmitted ?? 0;
    const totalEligible = voteData?.totalEligible ?? 0;
    const submittedPercentage =
      totalEligible > 0 ? Math.min(100, Math.round((totalSubmitted / totalEligible) * 100)) : 0;
    const showSubmissionStatus = getSimulationFlowSettings(
      session?.simulation.preferences,
    ).showVoteSubmissionStatus;
    const showAnonymousJustifications = getSimulationFlowSettings(
      session?.simulation.preferences,
    ).showAnonymousJustifications;
    const activeJustificationOption =
      decision?.options.find((option) => option.label === justificationVoteTab) ??
      decision?.options[0];
    const visibleJustifications = (voteData?.justifications ?? []).filter(
      (item) => item.optionId === activeJustificationOption?.id,
    );

    return (
      <div className="flex min-h-dvh flex-col">
        {previewBar}
        <div data-simulation-scroll-container className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="px-3 py-4 sm:px-4 sm:py-8">
            <div className="max-w-5xl mx-auto space-y-4">
              <SimulationTopHeader
                decisionCount={decisions.length}
                activeStage={`decision-${decisionIndex + 1}`}
                roleLabel={selectedRoleLabel}
              />
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-lg sm:text-xl">{votesTitle}</CardTitle>
                  <CardDescription>{votesDescription}</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 space-y-4">
                  <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm sm:w-fit">
                    <span className="font-medium tabular-nums">
                      {totalSubmitted} vote{totalSubmitted === 1 ? "" : "s"}
                    </span>
                    {showSubmissionStatus ? (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground tabular-nums">
                          {totalSubmitted}/{totalEligible}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {submittedPercentage}% submitted
                        </Badge>
                      </>
                    ) : null}
                  </div>
                  <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
                    <div className="mx-auto flex w-48 flex-col items-center">
                      <div
                        className="grid h-48 w-48 place-items-center rounded-full p-7"
                        style={{
                          background:
                            totalSubmitted > 0
                              ? `conic-gradient(${voteGradient})`
                              : "#86827b",
                        }}
                      >
                        <div className="grid h-full w-full place-items-center rounded-full bg-card text-center shadow-inner dark:bg-zinc-900">
                          <div>
                            <p className="text-3xl font-bold tabular-nums">{totalSubmitted}</p>
                            <p className="text-xs text-muted-foreground">Total votes</p>
                          </div>
                        </div>
                      </div>
                      <div aria-label="Vote chart legend" className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
                        {(decision?.options ?? []).map((option, index) => (
                          <span key={option.id} className="inline-flex items-center gap-1">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: voteColors[index % voteColors.length] }}
                              aria-hidden
                            />
                            {option.label}. {option.title}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(decision?.options ?? []).map((option, index) => {
                        const count = optionCounts[index] ?? 0;
                        const pct = optionPercentages[index] ?? 0;
                        const isChosen = selectedOpt?.id === option.id;
                        return (
                          <div
                            key={option.id}
                            className={`space-y-3 rounded-xl border-2 p-4 transition-colors ${
                              isChosen
                                ? "border-[#ea580c] bg-[#ea580c] text-white shadow-[0_0_0_1px_rgba(234,88,12,0.15)] dark:border-[#fb923c] dark:bg-[#c2410c]"
                                : "border-[#e5e7eb] bg-white dark:border-[#374151] dark:bg-[#111827]"
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <span
                                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold ${
                                    isChosen ? "bg-white/20 text-white" : "text-white"
                                  }`}
                                  style={isChosen ? undefined : { backgroundColor: voteColors[index % voteColors.length] }}
                                >
                                  {option.label}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className={`break-words font-semibold ${isChosen ? "text-white" : "text-foreground"}`}>
                                      {option.label}. {option.title}
                                    </p>
                                    <span
                                      className={`text-xs font-medium tabular-nums ${
                                        isChosen ? "text-white/85" : "text-muted-foreground"
                                      }`}
                                    >
                                      {count} vote{count === 1 ? "" : "s"}
                                    </span>
                                    {isChosen ? (
                                      <Badge className="border border-white/30 bg-[#f97316] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#f97316]">
                                        <Check className="mr-1 h-3 w-3" /> Your vote
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              <span className={`shrink-0 text-base font-bold tabular-nums sm:text-lg ${isChosen ? "text-white" : "text-foreground"}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className={`ml-11 h-1.5 overflow-hidden rounded-full ${isChosen ? "bg-white/25" : "bg-[#e5e7eb] dark:bg-[#374151]"}`}>
                              <div
                                className={`h-full rounded-full ${isChosen ? "bg-white" : "bg-[#f97316] dark:bg-[#fb923c]"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {showAnonymousJustifications ? (
                    <div className="rounded-xl border bg-card p-4">
                      <h3 className="font-semibold">Top Justifications from Your Class</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Shared anonymously. Your instructor can still see each response.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(decision?.options ?? []).map((option) => (
                          <Button
                            key={option.id}
                            type="button"
                            size="sm"
                            variant={
                              activeJustificationOption?.id === option.id ? "default" : "outline"
                            }
                            onClick={() => {
                              setJustificationVoteTab(option.label);
                              setShowAllJustifications(false);
                            }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <div className="mt-3 space-y-2">
                        {visibleJustifications.length === 0 ? (
                          <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                            No shared justifications for this option yet.
                          </p>
                        ) : (
                          visibleJustifications
                            .slice(0, showAllJustifications ? undefined : 3)
                            .map((item, index) => (
                              <p
                                key={`${item.optionId}-${index}`}
                                className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed"
                              >
                                &ldquo;{item.text}&rdquo;
                              </p>
                            ))
                        )}
                      </div>
                      {visibleJustifications.length > 3 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => setShowAllJustifications((value) => !value)}
                        >
                          {showAllJustifications ? "Show Fewer" : "See More Justifications"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!decision || !selectedOpt) return;
                    setCurrentStep(decisionIndex + 2);
                    setSelectedOption(selectedOpt.id);
                    setShowConsequence(true);
                  }}
                  className="min-h-[44px]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                  Back to Consequence
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToScenario(5, false)}
                  className="min-h-[44px]"
                >
                  <BookOpen className="mr-2 h-4 w-4 shrink-0" />
                  View Full Scenario
                </Button>
                <Button
                  onClick={() => {
                    if (session && decision) {
                      sessionStorage.setItem(
                        `class_votes_seen_${session.id}_${decision.id}`,
                        "1",
                      );
                    }
                    setShowConsequence(false);
                    setSelectedOption(null);
                    setJustification("");
                    setResponseInputMode("text");
                    clearVideoSelection();
                    setCurrentConsequence("");
                    setCurrentDataImpact(undefined);
                    setOutcomeTier(null);
                    setOutcomeReasoning("");
                    setAiJustificationFeedback(null);
                    setClassVotesDecisionIndex(null);
                    setCurrentStep(
                      decisionIndex < decisions.length - 1 ? decisionIndex + 3 : 6,
                    );
                  }}
                  className="min-h-[48px]"
                >
                  {decisionIndex < decisions.length - 1 ? "Continue" : "Reflection"}
                  <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reflection screen
  if (currentStep === 6) {
    return (
      <div className="flex min-h-dvh flex-col">
        {previewBar}
        <div data-simulation-scroll-container className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="px-3 py-4 sm:px-4 sm:py-8">
            <div className="max-w-5xl mx-auto space-y-4">
              <SimulationTopHeader
                decisionCount={decisions.length}
                activeStage="reflection"
                roleLabel={selectedRoleLabel}
              />
              <Button
                variant="outline"
                onClick={() => goToScenario(6, false)}
                className="w-full sm:w-auto min-h-[44px]"
              >
                <BookOpen className="mr-2 h-4 w-4 shrink-0" />
                View scenario
              </Button>

              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <Badge variant="secondary" className="w-fit mb-2">Reflection</Badge>
                  <CardTitle className="text-lg sm:text-xl">Reflect on Your Experience</CardTitle>
                  <CardDescription className="text-sm">Take a moment to think about what you learned</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-4 sm:px-6">
                  {reflectionQuestions.map((question) => (
                    <div key={question.id} className="space-y-2">
                      <Label className="text-sm sm:text-base">{question.question}</Label>
                      <Textarea
                        placeholder="Your thoughts..."
                        value={reflectionAnswers[question.id] || ""}
                        onChange={(e) => setReflectionAnswers(prev => ({
                          ...prev,
                          [question.id]: e.target.value.slice(0, 1000)
                        }))}
                        rows={4}
                        maxLength={1000}
                        className="min-h-[100px] text-base"
                      />
                    </div>
                  ))}

                  <div className="flex justify-end">
                    <Button
                      onClick={submitReflection}
                      disabled={
                        submitting ||
                        reflectionQuestions.some(
                          (question) => !reflectionAnswers[question.id]?.trim(),
                        )
                      }
                      className="min-h-[48px] w-full sm:w-auto"
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Complete Simulation
                      <Check className="ml-2 h-4 w-4 shrink-0" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  return (
    <div className="flex min-h-dvh flex-col">
      {previewBar}
      <div data-simulation-scroll-container className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#fffaf6] dark:bg-[#08121e]">
        <div className="px-3 py-4 sm:px-4 sm:py-8">
          <div className="mx-auto max-w-5xl space-y-4">
            <SimulationTopHeader
              decisionCount={decisions.length}
              activeStage="completion"
              roleLabel={selectedRoleLabel}
            />
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full border-[#fed7aa] bg-white text-sm font-semibold text-[#9a3412] hover:bg-[#fff7ed] hover:text-[#9a3412] dark:border-[#7c2d12] dark:bg-transparent dark:text-[#fdba74] dark:hover:bg-[#7c2d12]/30 sm:h-10 sm:w-auto"
                onClick={() => {
                  if (!session) return;
                  window.dispatchEvent(
                    new CustomEvent("praxis:view-podium", { detail: { sessionId: session.id } }),
                  );
                }}
                disabled={!canViewPodium}
              >
                <Trophy className="h-4 w-4 text-[#ea580c] dark:text-[#fb923c]" aria-hidden />
                View Your Rank
              </Button>
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#f1f5f9] bg-white p-4 shadow-sm dark:border-[#1f2937] dark:bg-[#111827] sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
                  <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[#fff7ed] dark:bg-[#7c2d12]/30 sm:h-24 sm:w-24">
                    <span aria-hidden className="absolute -left-1 -top-2 text-base text-[#f97316]">✦</span>
                    <span aria-hidden className="absolute -right-1 top-0 text-sm text-[#fb923c]">•</span>
                    <span aria-hidden className="absolute -bottom-1 right-0 text-sm text-[#ef5b6a]">✦</span>
                    <Trophy className="h-12 w-12 text-[#ea580c] dark:text-[#fb923c] sm:h-14 sm:w-14" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#111827] dark:text-[#f9fafb] sm:text-3xl">
                      Simulation Complete! <span aria-hidden>🎉</span>
                    </h1>
                    <p className="mt-0.5 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      Thank you for participating, {participantName || "student"}.
                    </p>
                  </div>
                </div>
                <div className="border-t border-[#f1f5f9] pt-4 sm:min-w-40 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 dark:border-[#1f2937]">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-[#6b7280] dark:text-[#9ca3af]">
                    <BarChart3 className="h-4 w-4" aria-hidden />
                    Final rank
                  </div>
                  <p className="mt-0.5 text-4xl font-bold leading-none text-[#ea580c] dark:text-[#fb923c] sm:text-[42px]" aria-live="polite">
                    {completionRankLoading && completionRank === null ? "—" : completionRank === null ? "—" : `#${completionRank}`}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#16a34a] dark:text-[#34d399]">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                    Updating in real time
                  </p>
                  <div className="mt-3 border-t border-[#f1f5f9] pt-2.5 dark:border-[#1f2937]">
                    <p className="text-xs font-medium text-[#6b7280] dark:text-[#9ca3af]">Final score</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#111827] dark:text-[#f9fafb]">
                      {completionScore}
                      {completionScoreMax > 0 ? ` / ${completionScoreMax}` : ""} points
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                {canViewPodium && session ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full border-[#e5e7eb] bg-white text-sm text-[#111827] hover:bg-[#fffaf5] dark:border-[#374151] dark:bg-transparent dark:text-[#f9fafb] dark:hover:bg-[#1f2937] sm:h-10 sm:w-auto"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("praxis:view-podium", { detail: { sessionId: session.id } }),
                      );
                    }}
                  >
                    <Trophy className="h-4 w-4" aria-hidden />
                    View podium
                  </Button>
                ) : null}
                {completedReportId || studentAttemptId ? (
                  <Button asChild className="min-h-11 w-full bg-[#ea580c] text-sm text-white hover:bg-[#c2410c] hover:text-white dark:bg-[#fb923c] dark:text-[#431407] dark:hover:bg-[#f97316] sm:h-10 sm:w-auto">
                    <Link href={`/student/reports/${completedReportId ?? studentAttemptId}`}>
                      View full report
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-[#111827] dark:text-[#f9fafb]">Your decisions</h2>
              {decisions.map((decision, index) => {
                const response = myResponses.find((item) => item.decision_id === decision.id);
                const selectedOpt = decision.options.find((option) => option.id === response?.option_id);
                const snapshot = decisionOutcomeSnapshots[decision.id];
                const tier = snapshot?.tier ?? optionScoreToTier(response?.score);
                const tierStyle = OUTCOME_TIER_STYLES[tier];
                const consequence =
                  snapshot?.consequence ||
                  selectedOpt?.consequence?.trim() ||
                  "The consequence for this decision is not available yet.";
                const reasoning = snapshot?.outcomeReasoning || "";
                const impacts = snapshot?.dataImpact ?? [];
                const expanded = expandedDecisionIds.includes(decision.id);
                const Icon = index === 0 ? BookOpen : index === 1 ? TrendingUp : Star;
                return (
                  <article key={decision.id} className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white dark:border-[#374151] dark:bg-[#111827]">
                    <div className="flex items-start gap-3 p-3.5 sm:p-4">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#fed7aa] text-sm font-semibold text-[#ea580c] dark:border-[#7c2d12] dark:text-[#fb923c]">
                        {index + 1}
                      </span>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${COMPLETION_OUTCOME_ICON_STYLES[tier]}`}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#111827] dark:text-[#f9fafb]">Decision {index + 1}</p>
                        <p className="mt-0.5 break-words text-xs text-[#6b7280] dark:text-[#9ca3af]">
                          {decision.prompt}
                        </p>
                        <p className="mt-1 break-words text-xs font-medium text-[#374151] dark:text-[#d1d5db]">
                          {selectedOpt
                            ? `You chose: ${selectedOpt.label}. ${selectedOpt.title}`
                            : "No response"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#9ca3af]">Outcome</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierStyle.badge}`}>
                            {tier} Outcome
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-label={`${expanded ? "Hide" : "Show"} consequence details for decision ${index + 1}`}
                          aria-expanded={expanded}
                          onClick={() => setExpandedDecisionIds((current) =>
                            current.includes(decision.id)
                              ? current.filter((id) => id !== decision.id)
                              : [...current, decision.id],
                          )}
                          className="grid h-9 w-9 place-items-center rounded-lg text-[#6b7280] transition hover:bg-[#fff7ed] hover:text-[#ea580c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] dark:text-[#9ca3af] dark:hover:bg-[#1f2937]"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                        </button>
                      </div>
                    </div>
                    {expanded ? (
                      <div className="space-y-3 border-t border-[#f1f5f9] px-4 py-3 text-sm leading-6 text-[#6b7280] dark:border-[#1f2937] dark:text-[#9ca3af]">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#374151] dark:text-[#d1d5db]">
                            What happened next
                          </p>
                          <p className="mt-1 whitespace-pre-line">{consequence}</p>
                        </div>
                        {reasoning ? (
                          <p className="rounded-lg bg-[#fff7ed] px-3 py-2 text-sm text-[#7c2d12] dark:bg-[#7c2d12]/25 dark:text-[#fdba74]">
                            <span className="font-semibold">Why this outcome: </span>
                            {reasoning}
                          </p>
                        ) : null}
                        {impacts.length > 0 ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {impacts.map((impact, impactIndex) => (
                              <div
                                key={`${impact.label}-${impactIndex}`}
                                className="rounded-lg bg-[#f8fafc] px-3 py-2 text-xs leading-5 dark:bg-[#0f172a]"
                              >
                                <p className="font-semibold text-[#374151] dark:text-[#e5e7eb]">
                                  {impact.label}
                                </p>
                                <p>{impact.description}</p>
                                <p className="mt-0.5 text-[#6b7280] dark:text-[#9ca3af]">
                                  {impact.reason}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>

            {!feedbackDismissed ? (
              <FeedbackCard
                variant="studentCompletion"
                simulationId={session?.simulation.id || ""}
                sessionId={session?.id}
                participantId={participantId || undefined}
                feedbackType="post_session"
                role="student"
                onDismiss={() => setFeedbackDismissed(true)}
              />
            ) : null}

            <nav
              aria-label="Completed simulation navigation"
              className="flex flex-col-reverse gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between"
            >
              <Button
                type="button"
                variant="outline"
                aria-label="Return to Dashboard"
                className="min-h-11 w-full border-[#fed7aa] bg-white font-medium text-[#9a3412] hover:bg-[#fff7ed] hover:text-[#9a3412] dark:border-[#7c2d12] dark:bg-transparent dark:text-[#fdba74] dark:hover:bg-[#7c2d12]/30 sm:w-auto"
                disabled={completionNavigation !== null}
                onClick={() => navigateAfterCompletion("dashboard")}
              >
                {completionNavigation === "dashboard" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                )}
                Return to Dashboard
              </Button>
              <Button
                type="button"
                aria-label="Finish & Return Home"
                className="min-h-11 w-full bg-[#ea580c] text-white hover:bg-[#c2410c] hover:text-white dark:bg-[#fb923c] dark:text-[#431407] dark:hover:bg-[#f97316] sm:w-auto"
                disabled={completionNavigation !== null}
                onClick={() => navigateAfterCompletion("home")}
              >
                {completionNavigation === "home" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                Finish &amp; Return Home
                {completionNavigation === "home" ? null : (
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                )}
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
