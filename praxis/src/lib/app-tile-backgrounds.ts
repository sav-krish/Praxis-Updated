/**
 * Soft pastel gradient classes used on dashboard/library tiles (mirroring the
 * landing palette). Indexes map to simulation difficulty via
 * {@link appTileBackgroundForDifficulty}:
 *   [0] hard (warm apricot; default when difficulty is unset)
 *   [1] easy (peach cream)
 *   [2] challenge (tangerine glow)
 */
export const APP_TILE_BACKGROUNDS = [
  "bg-[linear-gradient(160deg,#fff0e1_0%,#fff7ef_50%,#ffdabb_100%)]",
  "bg-[linear-gradient(160deg,#fff4e8_0%,#fffaf4_50%,#ffe6d3_100%)]",
  "bg-[linear-gradient(160deg,#ffe4ce_0%,#fff1e5_50%,#ffc795_100%)]",
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
