/**
 * Soft pastel gradient classes used on dashboard/library tiles (mirroring the
 * landing palette). Indexes map to simulation difficulty via
 * {@link appTileBackgroundForDifficulty}:
 *   [0] hard (lavender; default when difficulty is unset)
 *   [1] easy (mint)
 *   [2] challenge (sky blue)
 */
export const APP_TILE_BACKGROUNDS = [
  "bg-[linear-gradient(160deg,#ecefff_0%,#f5f6fc_50%,#e2e8fa_100%)]",
  "bg-[linear-gradient(160deg,#e8f2eb_0%,#f4f8f5_50%,#ddebe2_100%)]",
  "bg-[linear-gradient(160deg,#e3f1fb_0%,#f2f9fd_50%,#d7e8f5_100%)]",
] as const;

export type AppTileBackground = (typeof APP_TILE_BACKGROUNDS)[number];

/** DB / product difficulty levels mapped 1:1 to the three pastel gradients. */
export type SimulationDifficulty = "easy" | "hard" | "challenge";

/**
 * Stable tile tint by difficulty so dashboard/library cards encode complexity
 * visually. Missing values default to `"hard"` (creation default).
 */
export function appTileBackgroundForDifficulty(
  difficulty: SimulationDifficulty | string | null | undefined
): AppTileBackground {
  if (difficulty === "easy") return APP_TILE_BACKGROUNDS[1];
  if (difficulty === "challenge") return APP_TILE_BACKGROUNDS[2];
  return APP_TILE_BACKGROUNDS[0]; // hard (default)
}
