const BUCKET = "simulation-scenario-images";

/** Public URL for a file in the scenario images bucket (`storage_path` from DB). */
export function publicScenarioImageUrl(storagePath: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base || !storagePath) return "";
  const encoded = storagePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

export const SCENARIO_IMAGES_BUCKET = BUCKET;
