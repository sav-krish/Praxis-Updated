"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  SimulationEntryModal,
  SimulationOnboardingCarousel,
  type OnboardingScreenId,
} from "@/components/simulation/preface-modal";
import { SimulationAssistant } from "@/components/simulation/simulation-assistant";
import { LeaderboardOverlays } from "@/components/simulation/leaderboard-overlays";
import { getSimulationFlowSettings } from "@/lib/simulation-flow";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

interface StudentExperiencePayload {
  session: {
    id: string;
    status: string;
    student_flow_settings?: Json | null;
    simulation: {
      id: string;
      title: string;
      background_content: string | null;
      estimated_minutes?: number | null;
      preferences?: Json;
    };
  };
  participant: {
    id: string;
    name: string;
  } | null;
  playerProfile: {
    profile_name: string;
  } | null;
  decisions: Array<{ id: string }>;
  responses: Array<{ decision_id: string; option_id: string }>;
}

const GLOBAL_SUPPRESSION_PREFIX = "praxis_onboarding_suppressed";
const SIMULATION_SEEN_PREFIX = "praxis_onboarding_seen";

export type StudentLeaderboardPhase =
  | "decision"
  | "reflection"
  | "completion";

const StudentLeaderboardPhaseContext = createContext<
  Dispatch<SetStateAction<StudentLeaderboardPhase>> | null
>(null);

export function useStudentLeaderboardPhase(): Dispatch<
  SetStateAction<StudentLeaderboardPhase>
> {
  const setLeaderboardPhase = useContext(StudentLeaderboardPhaseContext);
  if (!setLeaderboardPhase) {
    throw new Error(
      "useStudentLeaderboardPhase must be used inside StudentExperienceShell",
    );
  }
  return setLeaderboardPhase;
}

function summarizeScenario(background: string | null): string {
  if (!background?.trim()) {
    return "Step into the scenario, weigh the trade-offs, and see how your decisions shape the outcome.";
  }

  const plainText = background
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = plainText.match(/[^.!?]+[.!?]+/g);
  const summary = (sentences?.slice(0, 2).join(" ") || plainText).trim();
  return summary.length > 320 ? `${summary.slice(0, 317).trimEnd()}…` : summary;
}

function studentStorageIdentity(name: string): string {
  const normalized = name.trim().toLocaleLowerCase().replace(/\s+/g, "-");
  return encodeURIComponent(normalized || "student");
}

export function StudentExperienceShell({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const normalizedCode = code.toUpperCase();
  const onRoleSelectionPage = pathname.endsWith("/role-select");
  const [loading, setLoading] = useState(!onRoleSelectionPage);
  const [payload, setPayload] = useState<StudentExperiencePayload | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [individualMode, setIndividualMode] = useState(false);
  const [entryIsNew, setEntryIsNew] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStartScreen, setOnboardingStartScreen] =
    useState<OnboardingScreenId>("how-it-works");
  const [entryHelpPortalTarget, setEntryHelpPortalTarget] =
    useState<HTMLDivElement | null>(null);
  const [onboardingHelpPortalTarget, setOnboardingHelpPortalTarget] =
    useState<HTMLDivElement | null>(null);
  const [leaderboardPhase, setLeaderboardPhase] =
    useState<StudentLeaderboardPhase>("reflection");
  const persistedSeenRef = useRef<string | null>(null);

  const loadExperience = useCallback(async () => {
    if (onRoleSelectionPage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const baseResponse = await fetch(`/api/play/session/${normalizedCode}`, {
        cache: "no-store",
      });
      const basePayload = (await baseResponse.json().catch(() => null)) as
        | StudentExperiencePayload
        | null;
      if (!baseResponse.ok || !basePayload?.session) return;

      const sessionId = basePayload.session.id;
      const {
        data: { user },
      } = await createClient().auth.getUser();
      const storedOwnerId = sessionStorage.getItem(`participant_owner_${sessionId}`);
      const canUseStoredParticipant =
        !storedOwnerId || storedOwnerId === user?.id;
      if (!canUseStoredParticipant) {
        sessionStorage.removeItem(`participant_${sessionId}`);
        sessionStorage.removeItem(`participant_name_${sessionId}`);
        sessionStorage.removeItem(`participant_owner_${sessionId}`);
        sessionStorage.removeItem(`student_attempt_${sessionId}`);
        sessionStorage.removeItem(`participant_code_${normalizedCode}`);
      }
      setIndividualMode(
        canUseStoredParticipant && Boolean(sessionStorage.getItem(`student_attempt_${sessionId}`)),
      );
      const storedParticipantId =
        (canUseStoredParticipant
          ? sessionStorage.getItem(`participant_${sessionId}`) ||
            sessionStorage.getItem(`participant_code_${normalizedCode}`)
          : null) ||
        (!user && !storedOwnerId && localStorage.getItem("praxis_active_session_code") === normalizedCode
          ? localStorage.getItem("praxis_guest_participant_id")
          : null);

      if (!storedParticipantId) {
        setPayload(basePayload);
        return;
      }

      const response = await fetch(
        `/api/play/session/${normalizedCode}?participantId=${encodeURIComponent(storedParticipantId)}`,
        { cache: "no-store" },
      );
      const fullPayload = (await response.json().catch(() => null)) as
        | StudentExperiencePayload
        | null;
      if (!response.ok || !fullPayload?.participant) {
        if (
          response.status === 403 &&
          localStorage.getItem("praxis_active_session_code") === normalizedCode
        ) {
          localStorage.removeItem("praxis_active_session_code");
          localStorage.removeItem("praxis_guest_participant_id");
        }
        return;
      }

      setParticipantId(storedParticipantId);
      setPayload(fullPayload);
      if (user) {
        sessionStorage.setItem(`participant_owner_${sessionId}`, user.id);
      }

      const identity = studentStorageIdentity(fullPayload.participant.name);
      const suppressionKey = `${GLOBAL_SUPPRESSION_PREFIX}_${identity}`;
      const seenKey = `${SIMULATION_SEEN_PREFIX}_${identity}_${fullPayload.session.simulation.id}`;
      const onboardingResponse = await fetch(
        `/api/play/session/${normalizedCode}/onboarding?participantId=${encodeURIComponent(storedParticipantId)}`,
        { cache: "no-store" },
      );
      const onboardingState = (await onboardingResponse.json().catch(() => null)) as
        | {
            persistent?: boolean;
            studentOnboardingSeen?: boolean;
            studentSkipOnboardingGlobally?: boolean;
          }
        | null;
      const persistedOnboardingSeen =
        onboardingState?.persistent === true &&
        onboardingState.studentOnboardingSeen === true;
      const persistedGlobalSkip =
        onboardingState?.persistent === true &&
        onboardingState.studentSkipOnboardingGlobally === true;
      const alreadyStarted =
        fullPayload.responses.length > 0 ||
        persistedOnboardingSeen ||
        localStorage.getItem(seenKey) === "1";
      const suppressFuture =
        persistedGlobalSkip || localStorage.getItem(suppressionKey) === "1";
      setEntryIsNew(!alreadyStarted);
      setEntryOpen(!alreadyStarted && !suppressFuture);
    } finally {
      setLoading(false);
    }
  }, [normalizedCode, onRoleSelectionPage]);

  useEffect(() => {
    void loadExperience();
  }, [loadExperience]);

  const participant = payload?.participant ?? null;
  const simulation = payload?.session.simulation ?? null;
  const sessionId = payload?.session.id ?? null;
  const flowSettings = getSimulationFlowSettings(
    simulation?.preferences,
    payload?.session.student_flow_settings,
  );
  const identity = participant
    ? studentStorageIdentity(participant.name)
    : "student";
  const suppressionKey = `${GLOBAL_SUPPRESSION_PREFIX}_${identity}`;
  const seenKey = simulation
    ? `${SIMULATION_SEEN_PREFIX}_${identity}_${simulation.id}`
    : null;

  const persistOnboardingState = useCallback(
    (state: {
      studentOnboardingSeen?: boolean;
      studentSkipOnboardingGlobally?: boolean;
    }) => {
      if (!participantId) return;

      void fetch(`/api/play/session/${normalizedCode}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, ...state }),
      });
    },
    [normalizedCode, participantId],
  );

  useEffect(() => {
    if (!participantId || !simulation) return;

    const persistenceKey = `${participantId}:${simulation.id}`;
    if (persistedSeenRef.current === persistenceKey) return;
    persistedSeenRef.current = persistenceKey;

    persistOnboardingState({ studentOnboardingSeen: true });
  }, [participantId, persistOnboardingState, simulation]);

  const rememberEntryChoice = (suppressFuture: boolean) => {
    if (seenKey) localStorage.setItem(seenKey, "1");
    if (suppressFuture) localStorage.setItem(suppressionKey, "1");
    persistOnboardingState({
      studentOnboardingSeen: true,
      studentSkipOnboardingGlobally: suppressFuture || undefined,
    });
  };

  const startDirectly = (suppressFuture: boolean) => {
    rememberEntryChoice(suppressFuture);
    setEntryOpen(false);
  };

  const reviewOnboarding = (suppressFuture: boolean) => {
    rememberEntryChoice(suppressFuture);
    setEntryOpen(false);
    setOnboardingStartScreen("how-it-works");
    setOnboardingOpen(true);
  };

  const openOnboarding = (screen: OnboardingScreenId) => {
    setOnboardingStartScreen(screen);
    setOnboardingOpen(true);
  };

  const exitOnboarding = () => {
    if (seenKey) localStorage.setItem(seenKey, "1");
    setOnboardingOpen(false);
  };

  const roleLabel =
    payload?.playerProfile?.profile_name ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem(`role_label_${normalizedCode}`)
      : null) ||
    "Decision maker";
  const summary = useMemo(
    () => summarizeScenario(simulation?.background_content ?? null),
    [simulation?.background_content],
  );

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`student-flow-settings-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (event) => {
          const nextSettings = (
            event.new as { student_flow_settings?: Json | null }
          ).student_flow_settings;
          setPayload((current) =>
            current
              ? {
                  ...current,
                  session: {
                    ...current.session,
                    student_flow_settings: nextSettings ?? null,
                  },
                }
              : current,
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (onRoleSelectionPage) return children;

  return (
    <StudentLeaderboardPhaseContext.Provider value={setLeaderboardPhase}>
      {children}

      {loading ? (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-background">
          <Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Loading simulation" />
        </div>
      ) : null}

      {simulation && participant && sessionId ? (
        <>
          <SimulationEntryModal
            open={entryOpen}
            title={simulation.title}
            summary={summary}
            roleLabel={roleLabel}
            decisionCount={payload?.decisions.length ?? 0}
            estimatedMinutes={simulation.estimated_minutes ?? 25}
            isNew={entryIsNew}
            onStart={startDirectly}
            onReview={reviewOnboarding}
            onHelpPortalTargetChange={setEntryHelpPortalTarget}
          />
          <SimulationOnboardingCarousel
            open={onboardingOpen}
            decisionCount={payload?.decisions.length ?? 0}
            classVotesEnabled={flowSettings.classVotesEnabled}
            leaderboardEnabled={flowSettings.leaderboardEnabled}
            individualMode={individualMode}
            startScreen={onboardingStartScreen}
            onExit={exitOnboarding}
            onHelpPortalTargetChange={setOnboardingHelpPortalTarget}
          />
          <SimulationAssistant
            sessionKey={sessionId}
            decisionCount={payload?.decisions.length ?? 0}
            classVotesEnabled={flowSettings.classVotesEnabled}
            leaderboardEnabled={flowSettings.leaderboardEnabled}
            individualMode={individualMode}
            onOpenOnboarding={openOnboarding}
            helpPortalTarget={
              onboardingOpen
                ? onboardingHelpPortalTarget
                : entryOpen
                  ? entryHelpPortalTarget
                  : null
            }
            onReturnToSimulation={
              entryOpen
                ? () => startDirectly(false)
                : onboardingOpen
                  ? exitOnboarding
                  : undefined
            }
          />
          {participantId ? (
            <LeaderboardOverlays
              code={normalizedCode}
              sessionId={sessionId}
              participantId={participantId}
              phase={leaderboardPhase}
            />
          ) : null}
        </>
      ) : null}
    </StudentLeaderboardPhaseContext.Provider>
  );
}
