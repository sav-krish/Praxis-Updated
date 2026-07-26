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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Trash2,
  Star,
  TrendingUp,
  Minus,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { endPreviewSession } from "@/app/(dashboard)/session/[id]/actions";
import { decisionQualityFromScore, decisionQualityLabel, scorePercent } from "@/lib/student/scoring";
import { DataBlockRenderer } from "@/components/simulation/DataBlockRenderer";
import { FeedbackCard } from "@/components/simulation/FeedbackCard";
import { sourceTypeDisplayLabel } from "@/lib/source-display";
import { publicScenarioImageUrl } from "@/lib/scenario-image-url";
import { formatScheduleDateTime, getSimulationSessionSchedule } from "@/lib/session-schedule";
import type { Json } from "@/types/database";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimulationAssistant } from "@/components/simulation/simulation-assistant";
import {
  calculateQualitativeImpact,
  type QualitativeImpact,
} from "@/lib/student/qualitative-impact";
import { getSimulationFlowSettings } from "@/lib/simulation-flow";
import { PraxisLogo } from "@/components/praxis-logo";

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

function SimulationFlowNavigation({
  decisionCount,
  classVotesEnabled,
  activeStage,
}: {
  decisionCount: number;
  classVotesEnabled: boolean;
  activeStage: string;
}) {
  const stages = [
    { id: "background", label: "Background", shortLabel: "BG" },
    ...Array.from({ length: decisionCount }, (_, index) => ({
      id: `decision-${index + 1}`,
      label: `Decision ${index + 1}`,
      shortLabel: `D${index + 1}`,
    })),
    { id: "reflection", label: "Reflection", shortLabel: "Reflect" },
    { id: "complete", label: "Complete", shortLabel: "Done" },
  ];

  return (
    <nav
      aria-label="Simulation stages"
      className="w-full overflow-x-auto rounded-xl border bg-card px-2 py-1.5 shadow-sm"
    >
      <ol className="flex min-w-max items-center justify-center text-[11px] sm:text-xs">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flex items-center">
            {index > 0 ? <span className="mx-0.5 text-muted-foreground">›</span> : null}
            <span
              className={`rounded-md px-1.5 py-1 sm:px-2 ${
                activeStage === stage.id
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <span className="sm:hidden">{stage.shortLabel}</span>
              <span className="hidden sm:inline">{stage.label}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SimulationTopHeader({
  decisionCount,
  reflectionCount,
  completedSteps,
  roleLabel,
}: {
  decisionCount: number;
  reflectionCount: number;
  completedSteps: number;
  roleLabel: string;
}) {
  const totalSteps = Math.max(1, decisionCount + reflectionCount);
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 shadow-sm">
      <PraxisLogo className="h-9 w-auto" priority />
      <div
        className="hidden flex-1 items-center justify-center gap-1.5 sm:flex"
        aria-label={`${Math.min(completedSteps, totalSteps)} of ${totalSteps} required steps completed`}
      >
        {Array.from({ length: totalSteps }, (_, index) => (
          <span
            key={index}
            className={`h-1 w-7 rounded-full lg:w-10 ${
              index < completedSteps
                ? "bg-[#bf6b3d]"
                : "bg-[#e8e2da] dark:bg-[#4a4741]"
            }`}
          />
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className="max-w-40 truncate bg-[#f3e3d9] text-[#8f4b2d] hover:bg-[#f3e3d9]">
          {roleLabel}
        </Badge>
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [outcomeRating, setOutcomeRating] = useState<"excellent" | "decent" | "poor" | null>(null);
  const [outcomeReasoning, setOutcomeReasoning] = useState("");
  const [myResponses, setMyResponses] = useState<{ decision_id: string; option_id: string; score: number }[]>([]);
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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
  const [completedReportId, setCompletedReportId] = useState<string | null>(null);
  const [, setLoadingConsequence] = useState(false);
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

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

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
    const response = await fetch(`/api/play/session/${code.toUpperCase()}${params.size ? `?${params.toString()}` : ""}`);
    const result = (await response.json().catch(() => null)) as PlaySessionPayload | { error?: string } | null;
    if (!response.ok || !result || !("session" in result)) {
      throw new Error(result && "error" in result ? result.error : "Session not found");
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

    let storedParticipantId =
      sessionStorage.getItem(`participant_${initialSession.id}`) ||
      (localStorage.getItem("praxis_active_session_code") === code.toUpperCase()
        ? localStorage.getItem("praxis_guest_participant_id")
        : null);
    let storedName = sessionStorage.getItem(`participant_name_${initialSession.id}`);

    if (storedParticipantId) {
      sessionStorage.setItem(`participant_${initialSession.id}`, storedParticipantId);
      sessionStorage.setItem(`participant_code_${code.toUpperCase()}`, storedParticipantId);
    }

    if (urlParticipantId && urlParticipantName) {
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
    } catch {
      sessionStorage.removeItem(`participant_${initialSession.id}`);
      sessionStorage.removeItem(`participant_name_${initialSession.id}`);
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
    setSession(sessionWithSimulation);
    setParticipantCount(payload.participantCount ?? 0);
    setParticipantId(storedParticipantId);
    setParticipantName(existingParticipant.name || storedName || "");
    const participantTeamState = resolveParticipantTeamState(payload, storedParticipantId);
    setTeamId(participantTeamState.teamId);
    setTeamName(payload.team?.name ?? null);
    setTeamMembers(payload.team?.members ?? []);
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
    if (liveOption?.consequence?.trim()) {
      setCurrentConsequence(liveOption.consequence);
    }
  }, [currentStep, decisions, myResponses, showConsequence]);

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
        setTeamMembers(payload.team?.members ?? []);
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

    // Wait for the scenario-specific result before showing the consequence.
    // This avoids briefly rendering a generic result and replacing it seconds later.
    setLoadingConsequence(true);
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
      setCurrentConsequence(
        option?.consequence?.trim() ||
          data.consequence ||
          "Your choice has been recorded. The consequences of your decision are outlined below.",
      );
      setOutcomeRating(
        data.outcomeRating ||
          (option?.score && option.score >= 3
            ? "excellent"
            : option?.score && option.score >= 2
              ? "decent"
              : "poor"),
      );
      setOutcomeReasoning(data.outcomeReasoning || "");
      if (Array.isArray(data.impacts) && data.impacts.length === 4) {
        setCurrentDataImpact(data.impacts);
      }
      if (data.feedback) setAiJustificationFeedback(data.feedback);
    } catch {
      setCurrentConsequence(
        option?.consequence?.trim() ||
          "Your choice has been recorded. The consequences of your decision are outlined below.",
      );
      setOutcomeRating(
        option?.score && option.score >= 3
          ? "excellent"
          : option?.score && option.score >= 2
            ? "decent"
            : "poor",
      );
    } finally {
      setLoadingConsequence(false);
      setShowConsequence(true);
      setSubmitting(false);
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
    setOutcomeRating(null);
    setOutcomeReasoning("");
    setAiJustificationFeedback(null);

    if (participantId) {
      try {
        const payload = await fetchPlaySessionPayload(participantId);
        const participantTeamState = resolveParticipantTeamState(payload, participantId);
        setParticipantCount(payload.participantCount ?? 0);
        setTeamId(participantTeamState.teamId);
        setTeamName(payload.team?.name ?? null);
        setTeamMembers(payload.team?.members ?? []);
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
    router.push(`/edit/${session.simulation.id}`);
  };

  const totalScore = myResponses.reduce((sum, r) => sum + r.score, 0);
  const maxScore = decisions.length * 3;
  const displayScorePercent = scorePercent(totalScore, maxScore);

  const outcomeLabel = outcomeRating
    ? {
        excellent: "Excellent Outcome",
        decent: "Decent Outcome",
        poor: "Poor Outcome",
      }[outcomeRating]
    : null;

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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="px-3 py-4 sm:px-4 sm:py-8">
            <div className="max-w-5xl mx-auto space-y-4">
              <SimulationTopHeader
                decisionCount={decisions.length}
                reflectionCount={reflectionQuestions.length}
                completedSteps={0}
                roleLabel={selectedRoleLabel}
              />
              <SimulationFlowNavigation
                decisionCount={decisions.length}
                classVotesEnabled={
                  getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled
                }
                activeStage="background"
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
              <SimulationAssistant
                role={selectedRoleLabel}
                scenario={session?.simulation.background_content || ""}
              />
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

    // Show consequence after submission
    if (showConsequence) {
      return (
        <div className="flex min-h-dvh flex-col">
          {previewBar}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
            <div className="px-3 py-4 sm:px-4 sm:py-8">
              <div className="max-w-5xl mx-auto space-y-4">
                <SimulationTopHeader
                  decisionCount={decisions.length}
                  reflectionCount={reflectionQuestions.length}
                  completedSteps={decision.order_num}
                  roleLabel={selectedRoleLabel}
                />
                <SimulationFlowNavigation
                  decisionCount={decisions.length}
                  classVotesEnabled={
                    getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled
                  }
                  activeStage="consequence"
                />
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <Badge variant="secondary" className="mb-2 w-fit">Consequence</Badge>
                    <CardTitle className="text-xl sm:text-2xl">
                      Decision {decision.order_num} Result
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 space-y-4">
                    <div className="flex flex-col gap-4 rounded-2xl border border-[#f0d8c8] bg-[#fff8f1] p-5 dark:border-[#6b4938] dark:bg-[#2c241f] sm:flex-row sm:items-center">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#f8dfcf] dark:bg-[#5a3828]">
                        <Star className="h-7 w-7 fill-[#e75b0c] text-[#e75b0c]" />
                      </div>
                      <p className="min-w-0 flex-1 leading-relaxed text-foreground">
                        <strong className="text-[#c95a22]">
                          {outcomeLabel ?? "Decision outcome"}:
                        </strong>{" "}
                        {currentConsequence || "Your choice has been recorded."}
                        {outcomeReasoning ? ` ${outcomeReasoning}` : ""}
                      </p>
                      {outcomeLabel ? (
                        <Badge className="shrink-0 bg-[#e8f3df] text-[#356b26] hover:bg-[#e8f3df] dark:bg-[#294322] dark:text-[#bde3a9]">
                          {outcomeLabel}
                        </Badge>
                      ) : null}
                    </div>
                    {currentDataImpact && currentDataImpact.length > 0 ? (
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
                    <div className="flex flex-col sm:flex-row gap-2 justify-between pt-2">
                      <Badge variant="secondary" className="min-h-[44px] px-4">
                        Decision submitted
                      </Badge>
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
                          ? "Proceed to Class Votes →"
                          : decisionIndex < decisions.length - 1
                            ? "Proceed to Next Decision →"
                            : "Next: Reflection →"}
                        <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <SimulationAssistant
                  role={selectedRoleLabel}
                  scenario={session?.simulation.background_content || ""}
                  decision={decision.prompt}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-dvh flex-col">
        {previewBar}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="px-3 py-4 sm:px-4 sm:py-6">
            <div className="mx-auto mb-3 max-w-5xl">
              <SimulationTopHeader
                decisionCount={decisions.length}
                reflectionCount={reflectionQuestions.length}
                completedSteps={decision.order_num - 1}
                roleLabel={selectedRoleLabel}
              />
            </div>
            <div className="mx-auto mb-3 max-w-5xl">
              <SimulationFlowNavigation
                decisionCount={decisions.length}
                classVotesEnabled={
                  getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled
                }
                activeStage={`decision-${decision.order_num}`}
              />
            </div>
            <div className="mx-auto max-w-5xl">
            <div className="space-y-4 rounded-2xl border bg-[#fcfaf7] p-5 shadow-sm dark:bg-card sm:p-8">
              <Button
                variant="outline"
                onClick={() => goToScenario(currentStep, false)}
                className="w-full sm:w-auto min-h-[44px]"
              >
                <BookOpen className="mr-2 h-4 w-4 shrink-0" />
                View scenario
              </Button>

              <div className="space-y-2">
                <Badge variant="secondary" className="w-fit">
                  Decision {decision.order_num} of {decisions.length}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold leading-snug text-foreground break-words">
                  {decision.prompt}
                </h2>
              </div>

              {session?.simulation.mode === "teams" ? (
                <Card className="border-muted/80 bg-card/95 shadow-sm">
                  <CardContent className="space-y-3 px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{activeTeamName}</Badge>
                      <Badge variant={isTeamVoter ? "default" : "secondary"}>
                        {isTeamVoter ? "You are the voter" : "Non-voter"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentTeamDecision
                        ? "Your team choice is locked in. Add your own justification to continue."
                        : isTeamVoter
                          ? "Choose the option for your team. Every teammate still submits their own justification."
                          : "Waiting for your team voter to choose an option. Once they do, you will add your own justification."}
                    </p>
                    {teamMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {teamMembers.map((member) => (
                          <Badge key={member.id} variant={member.is_voter ? "default" : "secondary"}>
                            {member.name}
                            {member.is_voter ? " (Voter)" : ""}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border-muted/80 bg-card/95 shadow-sm">
                <CardContent className="space-y-3 px-4 sm:px-6 pt-5">
                  <RadioGroup
                    value={selectedOption || ""}
                    onValueChange={(value) => {
                      if (session?.simulation.mode === "teams" && !canSelectTeamChoice) return;
                      setSelectedOption(value);
                    }}
                  >
                    {decision.options.map((option) => (
                      <div
                        key={option.id}
                        className={`rounded-xl border-2 transition-all duration-200 ${
                          selectedOption === option.id
                            ? "border-primary/60 bg-primary/5 shadow-sm"
                            : "border-border/60 bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className={`flex items-start gap-3 p-3 sm:p-4 min-h-[48px] ${
                            session?.simulation.mode === "teams" && !canSelectTeamChoice
                              ? "cursor-not-allowed opacity-80"
                              : "cursor-pointer"
                          }`}
                          onClick={() => {
                            if (session?.simulation.mode === "teams" && !canSelectTeamChoice) return;
                            setSelectedOption(option.id);
                          }}
                        >
                          <RadioGroupItem
                            value={option.id}
                            id={option.id}
                            disabled={Boolean(session?.simulation.mode === "teams" && !canSelectTeamChoice)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <Label htmlFor={option.id} className="cursor-pointer break-words text-sm font-medium text-foreground/95 sm:text-[15px]">
                              {option.label}. {option.title}
                            </Label>
                            {option.description ? (
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                {option.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              <Collapsible defaultOpen={isVideoJustification || Boolean(currentTeamDecision) || canSelectTeamChoice} className="group">
                <Card className="border-muted/80 bg-card/95 shadow-sm overflow-hidden p-0 gap-0">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full text-left px-4 sm:px-6 py-4 min-h-[48px] flex items-center justify-between gap-3 bg-transparent hover:bg-muted/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span className="text-sm font-medium text-muted-foreground">
                        {canChooseResponseInput
                          ? "Add response"
                          : isVideoJustification
                            ? "Add video response"
                            : "Add justification"}
                      </span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-6 pb-5 pt-0 border-t border-border/50">
                      {session?.simulation.mode === "teams" && waitingForTeamChoice && !canSelectTeamChoice ? (
                        <div className="pt-4 text-sm text-zinc-500 dark:text-zinc-400">
                          Waiting for your team voter to choose an option before you can submit your own justification.
                        </div>
                      ) : canChooseResponseInput ? (
                        <div className="mb-4 flex flex-wrap gap-2 pt-4">
                          <Button
                            type="button"
                            variant={responseInputMode === "text" ? "default" : "outline"}
                            onClick={() => {
                              setResponseInputMode("text");
                              clearVideoSelection();
                            }}
                          >
                            Text response
                          </Button>
                          <Button
                            type="button"
                            variant={responseInputMode === "video" ? "default" : "outline"}
                            onClick={() => {
                              setResponseInputMode("video");
                              setJustification("");
                            }}
                          >
                            Video response
                          </Button>
                        </div>
                      ) : null}
                      {isVideoJustification ? (
                        <div className="flex flex-col gap-4">
                          {recording ? (
                            <div className="order-1 space-y-3 sm:order-4">
                              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                                Recording in progress. Press stop when you finish your explanation.
                              </div>
                              <video
                                ref={liveVideoPreviewRef}
                                autoPlay
                                muted
                                playsInline
                                className="aspect-[4/5] w-full rounded-lg bg-black object-cover sm:aspect-video"
                              />
                            </div>
                          ) : null}
                          <p className="order-2 text-sm text-muted-foreground sm:order-1">
                            Record or upload a short video explaining your reasoning before continuing.
                          </p>
                          <div className="order-3 flex flex-wrap gap-2 sm:order-2">
                            {recording ? (
                              <Button type="button" variant="destructive" onClick={stopRecording}>
                                <Square className="mr-2 h-4 w-4" />
                                Stop Recording
                              </Button>
                            ) : (
                              <Button type="button" onClick={startRecording} disabled={preparingRecorder}>
                                {preparingRecorder ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Circle className="mr-2 h-4 w-4" />
                                )}
                                Record Video
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={recording}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Video
                            </Button>
                            {(videoFile || videoPreviewUrl) ? (
                              <Button type="button" variant="ghost" onClick={clearVideoSelection}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear
                              </Button>
                            ) : null}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleVideoUploadChange}
                          />
                          {videoError ? <p className="order-4 text-sm text-destructive sm:order-3">{videoError}</p> : null}
                          {videoPreviewUrl ? (
                            <div className="order-5 space-y-2 sm:order-5">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Video className="h-4 w-4" />
                                <span className="truncate">{videoFile?.name}</span>
                                {videoDurationSeconds ? <span>• {videoDurationSeconds}s</span> : null}
                              </div>
                              <video
                                key={videoPreviewUrl}
                                controls
                                preload="metadata"
                                src={videoPreviewUrl}
                                className="aspect-[4/5] w-full rounded-lg bg-black object-cover sm:aspect-video"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <Label htmlFor="justification" className="sr-only">Justification</Label>
                          <Textarea
                            id="justification"
                            placeholder="Explain your reasoning before submitting..."
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            rows={3}
                            className="resize-none bg-muted/30 border-border/60"
                          />
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled &&
              getSimulationFlowSettings(session?.simulation.preferences).showVoteSubmissionStatus &&
              submissionStatus?.decisionId === decision.id ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                  <span className="font-semibold">Live submission counter</span>
                  <span className="tabular-nums text-muted-foreground">
                    {submissionStatus.submitted} of {submissionStatus.eligible} students submitted
                  </span>
                </div>
              ) : null}
              {getSimulationFlowSettings(session?.simulation.preferences)
                .showAnonymousJustifications ? (
                <p className="text-xs text-muted-foreground">
                  Your response is anonymous to classmates, but your instructor can see it.
                </p>
              ) : null}
              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  onClick={submitDecision}
                  disabled={
                    !selectedOption ||
                    (isVideoJustification ? !videoFile : !justification.trim()) ||
                    Boolean(session?.simulation.mode === "teams" && waitingForTeamChoice && !canSelectTeamChoice) ||
                    submitting
                  }
                  className="shadow-sm min-h-[48px] w-full sm:w-auto"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitButtonLabel}
                </Button>
              </div>
            </div>
            {/* Live dashboard intentionally hidden for now. */}
            <SimulationAssistant
              role={selectedRoleLabel}
              scenario={session?.simulation.background_content || ""}
              decision={decision.prompt}
            />
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
    const highestVoteCount = Math.max(0, ...optionCounts);
    const winningIndexes = optionCounts.flatMap((count, index) =>
      count === highestVoteCount && count > 0 ? [index] : [],
    );
    const winningOption =
      winningIndexes.length === 1 ? decision?.options[winningIndexes[0]] : null;
    const activeJustificationOption =
      decision?.options.find((option) => option.label === justificationVoteTab) ??
      decision?.options[0];
    const visibleJustifications = (voteData?.justifications ?? []).filter(
      (item) => item.optionId === activeJustificationOption?.id,
    );

    return (
      <div className="flex min-h-dvh flex-col">
        {previewBar}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="px-3 py-4 sm:px-4 sm:py-8">
            <div className="max-w-5xl mx-auto space-y-4">
              <SimulationTopHeader
                decisionCount={decisions.length}
                reflectionCount={reflectionQuestions.length}
                completedSteps={decisionIndex + 1}
                roleLabel={selectedRoleLabel}
              />
              <SimulationFlowNavigation
                decisionCount={decisions.length}
                classVotesEnabled
                activeStage="class-votes"
              />
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-lg sm:text-xl">Class Votes</CardTitle>
                  <CardDescription>See how your class voted on this decision.</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 space-y-4">
                  <div className="inline-flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
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
                          {submittedPercentage}%
                        </Badge>
                      </>
                    ) : null}
                  </div>
                  <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
                    <div className="mx-auto grid h-48 w-48 place-items-center rounded-full p-7"
                      style={{
                        background:
                          totalSubmitted > 0
                            ? `conic-gradient(${voteGradient})`
                            : "#86827b",
                      }}
                    >
                      <div className="grid h-full w-full place-items-center rounded-full bg-card text-center shadow-inner">
                        <div>
                          <p className="text-3xl font-bold tabular-nums">{totalSubmitted}</p>
                          <p className="text-xs text-muted-foreground">Total votes</p>
                        </div>
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
                            className={`space-y-2 rounded-xl border p-4 ${
                              isChosen ? "border-primary/50 bg-primary/5" : "bg-card"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex min-w-0 items-start gap-3">
                                <span
                                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-bold text-white"
                                  style={{ backgroundColor: voteColors[index % voteColors.length] }}
                                >
                                  {option.label}
                                </span>
                                <div>
                                  <p className="font-semibold">
                                    {option.label}. {option.title}
                                  </p>
                                  {isChosen ? (
                                    <Badge className="mt-1" variant="secondary">Your vote</Badge>
                                  ) : null}
                                </div>
                              </div>
                              <span className="shrink-0 text-lg font-bold tabular-nums">
                                {count} · {pct}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      You voted
                    </p>
                    <p className="mt-1 font-semibold">
                      {selectedOpt
                        ? `${selectedOpt.label}. ${selectedOpt.title}`
                        : "No submitted choice found"}
                    </p>
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
                    setOutcomeRating(null);
                    setOutcomeReasoning("");
                    setAiJustificationFeedback(null);
                    setClassVotesDecisionIndex(null);
                    setCurrentStep(
                      decisionIndex < decisions.length - 1 ? decisionIndex + 3 : 6,
                    );
                  }}
                  className="min-h-[48px]"
                >
                  {decisionIndex < decisions.length - 1
                    ? `Continue to Decision ${decisionIndex + 2}`
                    : "Continue to Reflection"}
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
    const completedReflections = reflectionQuestions.filter(
      (question) => reflectionAnswers[question.id]?.trim(),
    ).length;
    const completedRequiredSteps = decisions.length + completedReflections;
    return (
      <div className="flex min-h-dvh flex-col">
        {previewBar}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
          <div className="px-3 py-4 sm:px-4 sm:py-8">
            <div className="max-w-5xl mx-auto space-y-4">
              <SimulationTopHeader
                decisionCount={decisions.length}
                reflectionCount={reflectionQuestions.length}
                completedSteps={completedRequiredSteps}
                roleLabel={selectedRoleLabel}
              />
              <SimulationFlowNavigation
                decisionCount={decisions.length}
                classVotesEnabled={
                  getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled
                }
                activeStage="reflection"
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
                          [question.id]: e.target.value
                        }))}
                        rows={4}
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
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
        <div className="px-3 py-4 sm:px-4 sm:py-8">
          <div className="max-w-5xl mx-auto space-y-4">
            <SimulationTopHeader
              decisionCount={decisions.length}
              reflectionCount={reflectionQuestions.length}
              completedSteps={decisions.length + reflectionQuestions.length}
              roleLabel={selectedRoleLabel}
            />
            <SimulationFlowNavigation
              decisionCount={decisions.length}
              classVotesEnabled={
                getSimulationFlowSettings(session?.simulation.preferences).classVotesEnabled
              }
              activeStage="complete"
            />
            <Card>
              <CardHeader className="text-center px-4 sm:px-6">
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-xl sm:text-2xl">Simulation Complete!</CardTitle>
                <CardDescription>Thank you for participating, {participantName}</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="text-center mb-4 sm:mb-6">
                  {studentAttemptId || completedReportId ? (
                    <>
                      <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                        {displayScorePercent}%
                      </div>
                      <p className="text-muted-foreground text-sm">Your score</p>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                        {totalScore} / {maxScore}
                      </div>
                      <p className="text-muted-foreground text-sm">Total Score</p>
                    </>
                  )}
                </div>

                {(completedReportId || studentAttemptId) && (
                  <div className="mb-4 flex justify-center">
                    <Button asChild className="min-h-[44px]">
                      <Link href={`/student/reports/${completedReportId ?? studentAttemptId}`}>
                        View full report
                      </Link>
                    </Button>
                  </div>
                )}

                <Separator className="my-4 sm:my-6" />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm sm:text-base">Your Decisions</h4>
                  {decisions.map((decision, index) => {
                    const response = myResponses.find(r => r.decision_id === decision.id);
                    const selectedOpt = decision.options.find(o => o.id === response?.option_id);
                    const quality = decisionQualityFromScore(response?.score);
                    const explanation =
                      selectedOpt?.consequence?.trim() ||
                      (quality === "strong"
                        ? "Strong choice that aligns well with the scenario objectives."
                        : quality === "partial"
                          ? "This captures part of the answer but misses important tradeoffs."
                          : "This choice overlooks key constraints in the scenario.");
                    return (
                      <div key={decision.id} className="p-3 bg-muted rounded-lg min-h-[52px] space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">Decision {index + 1}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {selectedOpt ? `${selectedOpt.label}. ${selectedOpt.title}` : "No response"}
                            </p>
                          </div>
                          <Badge variant={response?.score === 3 ? "default" : "secondary"} className="shrink-0">
                            {decisionQualityLabel(quality)}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-ink leading-relaxed">{explanation}</p>
                      </div>
                    );
                  })}
                </div>

                <Separator className="my-4 sm:my-6" />

                <FeedbackCard
                  simulationId={session?.simulation.id || ""}
                  sessionId={session?.id}
                  participantId={participantId || undefined}
                  feedbackType="post_session"
                  role="student"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
