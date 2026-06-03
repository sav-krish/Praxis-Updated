import type { Json } from "@/types/database";

export type SimulationSessionSchedule = {
  start_at: string | null;
  end_at: string | null;
};

const EMPTY_SCHEDULE: SimulationSessionSchedule = {
  start_at: null,
  end_at: null,
};

function isRecord(value: Json | undefined | null): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getSimulationSessionSchedule(
  preferences: Json | undefined | null
): SimulationSessionSchedule {
  if (!isRecord(preferences)) return EMPTY_SCHEDULE;
  const raw = preferences.session_schedule;
  if (!isRecord(raw)) return EMPTY_SCHEDULE;

  const start_at = typeof raw.start_at === "string" ? raw.start_at : null;
  const end_at = typeof raw.end_at === "string" ? raw.end_at : null;

  return { start_at, end_at };
}

export function setSimulationSessionSchedule(
  preferences: Json | undefined | null,
  schedule: SimulationSessionSchedule
): Json {
  const base = isRecord(preferences) ? { ...preferences } : {};
  if (!schedule.start_at && !schedule.end_at) {
    delete base.session_schedule;
    return base;
  }

  base.session_schedule = {
    start_at: schedule.start_at,
    end_at: schedule.end_at,
  };

  return base;
}

export function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function formatScheduleDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getScheduleValidationMessage(schedule: SimulationSessionSchedule): string | null {
  if (!schedule.start_at || !schedule.end_at) return null;
  return new Date(schedule.end_at).getTime() <= new Date(schedule.start_at).getTime()
    ? "End time must be after the start time."
    : null;
}
