/**
 * Shared layout for simulation cards on the dashboard and in the library:
 * grid breakpoints, gap, tile chrome, and primary actions stay aligned.
 */

/** Grid for dashboard “Your simulations” and library strips — single source of truth. */
export const SIMULATION_CARD_GRID_CLASS =
  "grid w-full gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

/** Grid cell wrapper — equal row heights and predictable overflow in CSS grid. */
export const SIMULATION_CARD_GRID_ITEM_CLASS = "min-w-0 h-full w-full";

/**
 * Classes applied after difficulty gradient ({@link appTileBackgroundForDifficulty}).
 * Compose: `${SIMULATION_CARD_TILE_SURFACE_CLASS} ${tile}`
 */
export const SIMULATION_CARD_TILE_SURFACE_CLASS =
  "group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border border-border shadow-[0_2px_8px_rgba(15,36,71,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-soft";

/** Primary title line — dashboard + library tiled cards. */
export const SIMULATION_CARD_TITLE_CLASS =
  "line-clamp-2 text-base font-semibold leading-snug text-ink";

/** Padding below header row (title + meta). */
export const SIMULATION_CARD_HEADER_CLASS = "pb-3";

/** Primary/outline CTAs in the card footer — matches dashboard Edit / Start. */
export const SIMULATION_CARD_ACTION_MIN_HEIGHT_CLASS = "min-h-[44px]";
