import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/** Concatenates `clsx` input then deduplicates/overrides Tailwind classes with `tailwind-merge`. */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Escape `%`, `_`, and `\` for use inside PostgREST `.ilike.%…%` patterns. */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
