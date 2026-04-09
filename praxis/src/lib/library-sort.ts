import type { LibrarySimulationRow } from "@/types/library";

/** Pinned first (by pinned_order), then favorites, then recency. */
export function sortLibrarySimulations(list: LibrarySimulationRow[]): LibrarySimulationRow[] {
  return [...list].sort((a, b) => {
    const pinA = a.is_pinned ? 1 : 0;
    const pinB = b.is_pinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;
    if (pinA && pinB) {
      const oa = a.pinned_order ?? 1_000_000;
      const ob = b.pinned_order ?? 1_000_000;
      if (oa !== ob) return oa - ob;
    }
    if (a.favorite_count !== b.favorite_count) return b.favorite_count - a.favorite_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function flagshipSimulations(list: LibrarySimulationRow[]): LibrarySimulationRow[] {
  return list
    .filter((s) => s.is_pinned)
    .sort((a, b) => (a.pinned_order ?? 1_000_000) - (b.pinned_order ?? 1_000_000));
}
