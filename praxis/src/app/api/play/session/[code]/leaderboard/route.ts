import { NextRequest, NextResponse } from "next/server";
import { getSimulationFlowSettings } from "@/lib/simulation-flow";
import {
  assignLeaderboardRanks,
  calculateLeaderboardMetrics,
  optionScoreToTier,
  percentileForRank,
  percentileLabel,
  tierToXp,
  type LeaderboardTier,
} from "@/lib/student/leaderboard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

const SCOPE_LABEL = "class";

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

  if (!participantId) {
    return json({ error: "participantId is required" }, 400);
  }

  const supabase = createServiceRoleClient();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select(
      "id, simulation_id, simulation:simulations(preferences)",
    )
    .eq("join_code", code.trim().toUpperCase())
    .single();

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
    supabase
      .from("participants")
      .select("id, name, joined_at")
      .eq("session_id", session.id)
      .order("joined_at", { ascending: true }),
    supabase
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
          participant.id === participantId
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
      percentile: percentileForRank(row.rank, rankedParticipantCount),
      percentileLabel: percentileLabel(
        row.rank,
        rankedParticipantCount,
        SCOPE_LABEL,
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
    percentile: percentileForRank(viewerRow.rank, rankedParticipantCount),
    percentileLabel: percentileLabel(
      viewerRow.rank,
      rankedParticipantCount,
      SCOPE_LABEL,
    ),
  };
  const rankAbove = viewer.rank === null ? null : viewer.rank - 1;
  const aboveRankedRow =
    rankAbove === null
      ? null
      : rankedRows.find((row) => row.rank === rankAbove) ?? null;
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
  const latestDecision =
    [
      ...(decisionsByParticipant.get(participantId)?.values() ?? []),
    ].sort((left, right) => {
      if (left.decisionNumber !== right.decisionNumber) {
        return right.decisionNumber - left.decisionNumber;
      }
      return right.submittedAt.localeCompare(left.submittedAt);
    })[0] ?? null;
  const simulation = session.simulation as
    | { preferences: Json | null }
    | null;
  const flowSettings = getSimulationFlowSettings(simulation?.preferences);

  return json({
    rows,
    topThree: rows.slice(0, 3),
    viewer,
    above,
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
    scopeLabel: SCOPE_LABEL,
    settings: {
      leaderboardEnabled: flowSettings.leaderboardEnabled,
      rankChipEnabled: flowSettings.rankChipEnabled,
      podiumEnabled: flowSettings.podiumEnabled,
    },
  });
}
