import type { Json } from "@/types/database";

export type SimulationFlowSettings = {
  classVotesEnabled: boolean;
  showVoteSubmissionStatus: boolean;
};

export type ConsequenceSnapshot = Record<string, string | null>;

function asRecord(value: Json | undefined | null): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? { ...value }
    : {};
}

export function getSimulationFlowSettings(
  preferences: Json | undefined | null,
): SimulationFlowSettings {
  const flow = asRecord(asRecord(preferences).simulation_flow);
  return {
    classVotesEnabled: flow.class_votes_enabled === true,
    showVoteSubmissionStatus: flow.show_vote_submission_status === true,
  };
}

export function setSimulationFlowSettings(
  preferences: Json | undefined | null,
  settings: SimulationFlowSettings,
): Json {
  const base = asRecord(preferences);
  base.simulation_flow = {
    class_votes_enabled: settings.classVotesEnabled,
    show_vote_submission_status:
      settings.classVotesEnabled && settings.showVoteSubmissionStatus,
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
