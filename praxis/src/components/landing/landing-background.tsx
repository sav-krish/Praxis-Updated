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
          background:
            "linear-gradient(155deg, #fff3e4 0%, #fff7ee 32%, #ffe6d3 62%, #ffd7b6 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 85% 55% at 15% 12%, rgba(253, 140, 46, 0.14), transparent 52%), radial-gradient(ellipse 75% 50% at 88% 78%, rgba(247, 98, 36, 0.1), transparent 48%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(249, 121, 42, 0.08), transparent 55%)",
        }}
      />
      <div className="absolute -top-32 right-10 h-64 w-64 rounded-full bg-[#ffd0a8]/45 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#fdb77f]/30 blur-3xl" />
    </div>
  );
}
