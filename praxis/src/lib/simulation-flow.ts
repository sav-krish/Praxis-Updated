import type { Json } from "@/types/database";

export type SimulationFlowSettings = {
  classVotesEnabled: boolean;
  showVoteSubmissionStatus: boolean;
  showAnonymousJustifications: boolean;
  leaderboardEnabled: boolean;
  rankChipEnabled: boolean;
  leaderboardAnonymous: boolean;
};

export type ConsequenceSnapshot = Record<string, string | null>;

function asRecord(value: Json | undefined | null): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? { ...value }
    : {};
}

export function getSimulationFlowSettings(
  preferences: Json | undefined | null,
  sessionSettings?: Json | undefined | null,
): SimulationFlowSettings {
  const flow = {
    ...asRecord(asRecord(preferences).simulation_flow),
    ...asRecord(sessionSettings),
  };
  return {
    classVotesEnabled: flow.class_votes_enabled !== false,
    showVoteSubmissionStatus: flow.show_vote_submission_status !== false,
    showAnonymousJustifications: flow.show_anonymous_justifications === true,
    leaderboardEnabled: flow.leaderboard_enabled !== false,
    rankChipEnabled: flow.rank_chip_enabled !== false,
    leaderboardAnonymous: flow.leaderboard_anonymous !== false,
  };
}

/**
 * A podium reveals student identities, so it is only available for a named
 * leaderboard with enough ranked participants to form standings.
 */
export function canShowLeaderboardPodium(
  settings: SimulationFlowSettings,
  participantCount: number,
  rankedParticipantCount: number,
): boolean {
  return (
    settings.leaderboardEnabled &&
    !settings.leaderboardAnonymous &&
    participantCount >= 2 &&
    rankedParticipantCount >= 2
  );
}

export function sessionFlowSettings(
  settings: SimulationFlowSettings,
): Json {
  return {
    class_votes_enabled: settings.classVotesEnabled,
    show_vote_submission_status:
      settings.classVotesEnabled && settings.showVoteSubmissionStatus,
    show_anonymous_justifications:
      settings.classVotesEnabled && settings.showAnonymousJustifications,
    leaderboard_enabled: settings.leaderboardEnabled,
    rank_chip_enabled: settings.rankChipEnabled,
    leaderboard_anonymous: settings.leaderboardAnonymous,
  };
}

export function withSessionFlowSettings(
  preferences: Json | undefined | null,
  sessionSettings: Json | undefined | null,
): Json {
  const base = asRecord(preferences);
  base.simulation_flow = {
    ...asRecord(base.simulation_flow),
    ...asRecord(sessionSettings),
  };
  return base;
}

export function setSimulationFlowSettings(
  preferences: Json | undefined | null,
  settings: SimulationFlowSettings,
): Json {
  const base = asRecord(preferences);
  base.simulation_flow = {
    ...asRecord(base.simulation_flow),
    class_votes_enabled: settings.classVotesEnabled,
    show_vote_submission_status:
      settings.classVotesEnabled && settings.showVoteSubmissionStatus,
    show_anonymous_justifications:
      settings.classVotesEnabled && settings.showAnonymousJustifications,
    leaderboard_enabled: settings.leaderboardEnabled,
    rank_chip_enabled: settings.rankChipEnabled,
    leaderboard_anonymous: settings.leaderboardAnonymous,
  };
  return base;
}

export function getLiveConsequenceSnapshot(
  preferences: Json | undefined | null,
  sessionId: string,
): ConsequenceSnapshot | null {
  const snapshots = asRecord(asRecord(preferences).live_consequence_snapshots);
  const rawSnapshot = snapshots[sessionId];
  if (!rawSnapshot || typeof rawSnapshot !== "object" || Array.isArray(rawSnapshot)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(rawSnapshot).flatMap(([optionId, consequence]) =>
      consequence === null || typeof consequence === "string"
        ? [[optionId, consequence]]
        : [],
    ),
  );
}

export function setLiveConsequenceSnapshot(
  preferences: Json | undefined | null,
  sessionId: string,
  snapshot: ConsequenceSnapshot,
): Json {
  const base = asRecord(preferences);
  const current = asRecord(base.live_consequence_snapshots);
  const recentEntries = Object.entries(current)
    .filter(([id]) => id !== sessionId)
    .slice(-11);

  base.live_consequence_snapshots = {
    ...Object.fromEntries(recentEntries),
    [sessionId]: snapshot,
  };
  return base;
}

export function preserveLiveConsequenceSnapshots(
  editedPreferences: Json | undefined | null,
  storedPreferences: Json | undefined | null,
): Json {
  const edited = asRecord(editedPreferences);
  const stored = asRecord(storedPreferences);
  if (stored.live_consequence_snapshots) {
    edited.live_consequence_snapshots = stored.live_consequence_snapshots;
  }
  return edited;
}
