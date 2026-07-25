/**
 * Fixed-position decorative background used by the marketing landing page.
 *
 * Three layers stacked at `-z-10`:
 *   1. A diagonal pastel gradient in warm orange tones.
 *   2. A trio of soft radial accents at varying offsets/opacity.
 *   3. Two blurred color orbs in opposite corners for depth.
 *
 * Render this once near the top of a page (or layout). It uses
 * `position: fixed` so it stays put as the user scrolls the content above it.
 *
 * Tagged `pointer-events-none` so it never intercepts clicks.
 */
export function LandingBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: "var(--praxis-page-gradient)",
        }}
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: "var(--praxis-accent-gradient)",
        }}
      />
      <div className="absolute -top-32 right-10 h-64 w-64 rounded-full bg-[#ffd0a8]/45 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#fdb77f]/30 blur-3xl" />
    </div>
  );
}
