import { NextRequest, NextResponse } from "next/server";
import {
  canShowLeaderboardPodium,
  getSimulationFlowSettings,
} from "@/lib/simulation-flow";
import {
  assignLeaderboardRanks,
  calculateLeaderboardMetrics,
  isFullyTied,
  leaderboardAboveContext,
  optionScoreToTier,
  percentileForRank,
  percentileLabel,
  tieBreakReason,
  tierToXp,
  type LeaderboardTier,
  type TieBreakReason,
} from "@/lib/student/leaderboard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

interface RouteContext {
  params: Promise<{ code: string }>;
}

type DecisionRow = {
  id: string;
  order_num: number;
  options: Array<{
    id: string;
    decision_id: string;
    score: number;
  }>;
};

type ParticipantRow = {
  id: string;
  name: string;
  joined_at: string;
};

type ResponseRow = {
  participant_id: string | null;
  decision_id: string;
  option_id: string;
  submitted_at: string;
};

type ScoredDecision = {
  decisionId: string;
  decisionNumber: number;
  tier: LeaderboardTier;
  xp: number;
  submittedAt: string;
};

function json(
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function roundForDisplay(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { code } = await params;
  const participantId = request.nextUrl.searchParams.get("participantId")?.trim();
  const requestedDecisionId = request.nextUrl.searchParams
    .get("decisionId")
    ?.trim();
  const requestedFinalReveal = request.nextUrl.searchParams.get("reveal") === "final";

  if (!participantId) {
    return json({ error: "participantId is required" }, 400);
  }

  const supabase = createServiceRoleClient();
  let { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      "id, simulation_id, student_flow_settings, simulation:simulations(preferences)",
    )
    .eq("join_code", code.trim().toUpperCase())
    .single();

  // Keep active sessions usable while a production database is receiving the
  // additive session-settings migration. New deployments use the first query.
  if (sessionError?.message?.includes("student_flow_settings")) {
    const legacySession = await supabase
      .from("sessions")
      .select("id, simulation_id, simulation:simulations(preferences)")
      .eq("join_code", code.trim().toUpperCase())
      .single();
    session = legacySession.data
      ? { ...legacySession.data, student_flow_settings: null }
      : null;
    sessionError = legacySession.error;
  }

  if (sessionError || !session) {
    return json({ error: "Session not found" }, 404);
  }

  const { data: viewerParticipant, error: viewerError } = await supabase
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .eq("session_id", session.id)
    .single();

  if (viewerError || !viewerParticipant) {
    return json({ error: "Participant not found" }, 404);
  }

  const { data: individualAttempt } = await supabase
    .from("student_simulation_attempts")
    .select("id")
    .eq("session_id", session.id)
    .eq("participant_id", participantId)
    .maybeSingle();
  const isIndividualMode = Boolean(individualAttempt);

  let participantScopeIds: string[] | null = null;
  let sessionScopeIds: string[] | null = null;
  if (isIndividualMode) {
    const { data: attempts, error: attemptsError } = await supabase
      .from("student_simulation_attempts")
      .select("session_id, participant_id")
      .eq("simulation_id", session.simulation_id)
      .not("participant_id", "is", null);

    if (attemptsError) {
      return json({ error: "Failed to load leaderboard" }, 500);
    }

    participantScopeIds = [...new Set(
      (attempts ?? []).flatMap((attempt) =>
        attempt.participant_id ? [attempt.participant_id] : [],
      ),
    )];
    sessionScopeIds = [...new Set((attempts ?? []).map((attempt) => attempt.session_id))];
  }

  const [
    { data: decisionData, error: decisionError },
    { data: participantData, error: participantError },
    { data: responseData, error: responseError },
  ] = await Promise.all([
    supabase
      .from("decisions")
      .select("id, order_num, options(id, decision_id, score)")
      .eq("simulation_id", session.simulation_id)
      .order("order_num", { ascending: true }),
    isIndividualMode && participantScopeIds
      ? supabase
          .from("participants")
          .select("id, name, joined_at")
          .in("id", participantScopeIds)
          .order("joined_at", { ascending: true })
      : supabase
          .from("participants")
          .select("id, name, joined_at")
          .eq("session_id", session.id)
          .order("joined_at", { ascending: true }),
    isIndividualMode && sessionScopeIds
      ? supabase
          .from("responses")
          .select("participant_id, decision_id, option_id, submitted_at")
          .in("session_id", sessionScopeIds)
      : supabase
          .from("responses")
          .select("participant_id, decision_id, option_id, submitted_at")
          .eq("session_id", session.id),
  ]);

  if (decisionError || participantError || responseError) {
    return json({ error: "Failed to load leaderboard" }, 500);
  }

  const decisions = (decisionData ?? []) as DecisionRow[];
  const participants = (participantData ?? []) as ParticipantRow[];
  const responses = (responseData ?? []) as ResponseRow[];
  const totalDecisions = decisions.length;
  const decisionOrder = new Map(
    decisions.map((decision) => [decision.id, decision.order_num]),
  );
  const optionDetails = new Map(
    decisions.flatMap((decision) =>
      decision.options.map((option) => [
        option.id,
        {
          decisionId: option.decision_id,
          score: option.score,
        },
      ] as const),
    ),
  );

  const decisionsByParticipant = new Map<
    string,
    Map<string, ScoredDecision>
  >();
  const simulation = session.simulation as
    | { preferences: Json | null }
    | null;
  const flowSettings = getSimulationFlowSettings(
    simulation?.preferences,
    (session as { student_flow_settings?: Json | null }).student_flow_settings,
  );

  for (const response of responses) {
    if (!response.participant_id) continue;

    const option = optionDetails.get(response.option_id);
    const order = decisionOrder.get(response.decision_id);
    if (
      !option ||
      option.decisionId !== response.decision_id ||
      order === undefined
    ) {
      continue;
    }

    const tier = optionScoreToTier(option.score);
    const scoredDecision: ScoredDecision = {
      decisionId: response.decision_id,
      decisionNumber: order,
      tier,
      xp: tierToXp(tier),
      submittedAt: response.submitted_at,
    };
    const participantDecisions =
      decisionsByParticipant.get(response.participant_id) ?? new Map();
    const existing = participantDecisions.get(response.decision_id);

    if (!existing || existing.submittedAt < response.submitted_at) {
      participantDecisions.set(response.decision_id, scoredDecision);
    }
    decisionsByParticipant.set(response.participant_id, participantDecisions);
  }

  const anonymousNumbers = new Map(
    [...participants]
      .sort((left, right) => {
        if (left.joined_at !== right.joined_at) {
          return left.joined_at < right.joined_at ? -1 : 1;
        }
        if (left.id < right.id) return -1;
        if (left.id > right.id) return 1;
        return 0;
      })
      .map((participant, index) => [participant.id, index + 1]),
  );
  const viewerCompletedAllDecisions =
    totalDecisions > 0 &&
    (decisionsByParticipant.get(participantId)?.size ?? 0) >= totalDecisions;
  // A final podium is intentionally only available on named leaderboards.
  // Keep anonymous labels anonymous even if a client manually requests a final
  // reveal URL.
  const revealFinalNames =
    requestedFinalReveal &&
    viewerCompletedAllDecisions &&
    !flowSettings.leaderboardAnonymous;

  const rankedRows = assignLeaderboardRanks(
    participants.map((participant) => {
      const scoredDecisions = [
        ...(decisionsByParticipant.get(participant.id)?.values() ?? []),
      ];
      const metrics = calculateLeaderboardMetrics(
        scoredDecisions.map((decision) => decision.xp),
        totalDecisions,
      );
      const anonymousNumber = anonymousNumbers.get(participant.id) ?? 0;

      return {
        participantId: participant.id,
        displayName:
          participant.id === participantId ||
          revealFinalNames ||
          !flowSettings.leaderboardAnonymous
            ? participant.name
            : `Anon Student ${String(anonymousNumber).padStart(2, "0")}`,
        isViewer: participant.id === participantId,
        ...metrics,
      };
    }),
  );
  const rankedParticipantCount = rankedRows.filter(
    (row) => row.rank !== null,
  ).length;
  const rows = rankedRows
    .filter((row) => row.rank !== null)
    .map((row) => ({
      participantId: row.participantId,
      displayName: row.displayName,
      isViewer: row.isViewer,
      rank: row.rank,
      score: roundForDisplay(row.score),
      averageXp:
        row.averageXp === null ? null : roundForDisplay(row.averageXp),
      completedDecisions: row.completedDecisions,
      totalDecisions: row.totalDecisions,
      perfectCount: row.perfectCount,
      percentile: percentileForRank(row.rank, rankedParticipantCount),
      percentileLabel: percentileLabel(
        row.rank,
        rankedParticipantCount,
        isIndividualMode ? "all completers" : "class",
      ),
    }));
  const viewerRow = rankedRows.find(
    (row) => row.participantId === participantId,
  );

  if (!viewerRow) {
    return json({ error: "Participant not found" }, 404);
  }

  const viewer = {
    participantId: viewerRow.participantId,
    displayName: viewerRow.displayName,
    isViewer: true,
    rank: viewerRow.rank,
    score: roundForDisplay(viewerRow.score),
    averageXp:
      viewerRow.averageXp === null
        ? null
        : roundForDisplay(viewerRow.averageXp),
    completedDecisions: viewerRow.completedDecisions,
    totalDecisions: viewerRow.totalDecisions,
    perfectCount: viewerRow.perfectCount,
    percentile: percentileForRank(viewerRow.rank, rankedParticipantCount),
    percentileLabel: percentileLabel(
      viewerRow.rank,
      rankedParticipantCount,
      isIndividualMode ? "all completers" : "class",
    ),
  };

  // --- Tie detection ---
  // Find all ranked rows that share the same rank as the viewer (fully tied).
  const tiedWithViewer = viewerRow.rank === null
    ? []
    : rankedRows.filter(
        (row) =>
          row.rank !== null &&
          row.rank === viewerRow.rank &&
          row.participantId !== viewerRow.participantId &&
          isFullyTied(row, viewerRow),
      );

  const { above: aboveRankedRow, playersAhead } = leaderboardAboveContext(
    rankedRows,
    participantId,
  );
  let tieBreakAboveReason: TieBreakReason | null = null;
  let tieBreakAboveName: string | null = null;
  if (
    aboveRankedRow &&
    viewerRow.completedDecisions > 0 &&
    aboveRankedRow.score === viewerRow.score
  ) {
    const reason = tieBreakReason(aboveRankedRow, viewerRow);
    if (reason) {
      tieBreakAboveReason = reason;
      tieBreakAboveName = aboveRankedRow.displayName;
    }
  }
  const aboveRow =
    aboveRankedRow === null
      ? null
      : rows.find(
          (row) => row.participantId === aboveRankedRow.participantId,
        ) ?? null;
  const above =
    aboveRow === null || aboveRankedRow === null
      ? null
      : {
          ...aboveRow,
          gapXp: roundForDisplay(aboveRankedRow.score - viewerRow.score),
        };
  const viewerDecisions = [
    ...(decisionsByParticipant.get(participantId)?.values() ?? []),
  ];
  const latestDecision = requestedDecisionId
    ? viewerDecisions.find(
        (decision) => decision.decisionId === requestedDecisionId,
      ) ?? null
    : viewerDecisions.sort((left, right) => {
        if (left.decisionNumber !== right.decisionNumber) {
          return right.decisionNumber - left.decisionNumber;
        }
        return right.submittedAt.localeCompare(left.submittedAt);
      })[0] ?? null;
  return json({
    rows,
    topThree: rows.slice(0, 3),
    viewer,
    above,
    tieInfo: {
      tiedCount: tiedWithViewer.length,
      tiedNames: tiedWithViewer.map((row) => {
        const p = participants.find((pp) => pp.id === row.participantId);
        return p?.id === participantId ||
          revealFinalNames ||
          !flowSettings.leaderboardAnonymous
          ? p?.name ?? null
          : `Anon Student ${String(anonymousNumbers.get(row.participantId) ?? 0).padStart(2, "0")}`;
      }).filter((name): name is string => name !== null),
      tieBreakReason: tieBreakAboveReason,
      tieBreakAboveName,
      playersAhead,
    },
    latestDecision:
      latestDecision === null
        ? null
        : {
            decisionId: latestDecision.decisionId,
            decisionNumber: latestDecision.decisionNumber,
            tier: latestDecision.tier,
            xp: latestDecision.xp,
          },
    totalDecisions,
    scopeLabel: isIndividualMode ? "all completers" : "class",
    scope: isIndividualMode ? "individual" : "class",
    settings: {
      leaderboardEnabled: flowSettings.leaderboardEnabled,
      rankChipEnabled: flowSettings.rankChipEnabled,
      canShowPodium: canShowLeaderboardPodium(
        flowSettings,
        participants.length,
        rankedParticipantCount,
      ),
    },
  });
}
