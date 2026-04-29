/**
 * Structured diagnostics helper. Prefer this over calling `console` directly from features
 * so tooling can funnel or mute output in one place.
 */
export const logger = {
  warn(...args: unknown[]): void {
    console.warn(...args);
  },

  error(...args: unknown[]): void {
    console.error(...args);
  },
};
