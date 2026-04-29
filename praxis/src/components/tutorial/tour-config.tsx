import type { Step, Tour } from "@/components/tutorial/nextstep-compat";

/**
 * Stable tour identifier — referenced by `useNextStep().startNextStep()` from the
 * auto-start effect and the "Replay tutorial" menu item. Anything that bumps
 * the user into the tour points at this one constant.
 */
export const PRAXIS_TOUR_ID = "praxisOnboarding";

/**
 * Anchor every tour step targets. We intentionally keep these as `data-tour`
 * attributes rather than `id`s so that:
 *   1. We can't collide with other IDs in the app (e.g. inputs already named
 *      `id="title"` on the create page).
 *   2. A momentarily double-rendered element during a Next.js route transition
 *      doesn't trigger React duplicate-id warnings.
 *   3. The intent is explicit: every match is part of the onboarding tour.
 *
 * NextStep's `selector` field is fed straight into `document.querySelector` so
 * any CSS selector works — `[data-tour="..."]` is the cleanest fit.
 */
export const TOUR_ANCHOR = {
  newSim: "new-sim",
  libraryLink: "library-link",
  profileMenu: "profile-menu",
  createTitle: "create-title",
  createSubject: "create-subject",
  createUpload: "create-upload",
  createGoal: "create-goal",
  createGenerate: "create-generate",
  favoriteButton: "favorite-button",
  copilotFab: "copilot-fab",
} as const;

const sel = (anchor: string) => `[data-tour="${anchor}"]`;

/**
 * Inputs that decide which optional steps are included in the tour.
 *
 * We compute these server-side (in the dashboard layout) so the filtered tour
 * is in its final shape *before* `<NextStep>` mounts. Filtering at runtime
 * (the original `<StepAnchorGate>` approach) means the user briefly sees a
 * step pointing at nothing while we wait for the watchdog to advance — which
 * was the bug behind: "the heart card shows even when the library is empty."
 *
 * Add a new field here whenever you introduce another step whose anchor only
 * exists conditionally; threading it through stays explicit and type-checked.
 */
export interface TourBuildOptions {
  /**
   * `true` iff the public library has at least one simulation. The favorite
   * step spotlights the heart on a library card; if no card exists, the step
   * is silently dropped from the tour.
   */
  libraryHasFavoritableSims: boolean;
}

/**
 * Builds the tour with conditionally-included steps removed.
 *
 * Defaults applied to every step:
 *   - `disableInteraction: true` — the highlighted control is *demonstrated*,
 *     not clicked. Users advance via the card's Next button. Without this, a
 *     user who clicked the actual "New Simulation" button would navigate to
 *     /create while the tour was still pointing at /dashboard, leaving the
 *     spotlight searching for an element that's no longer mounted.
 *   - `pointerPadding: 8` / `pointerRadius: 12` — visually-tight spotlight
 *     that hugs typical buttons. Round controls (avatar, FAB) override
 *     `pointerRadius` to 999 so the ring traces the circle.
 *   - `showControls: true` / `showSkip: true` — the custom card honours both.
 */
export function buildPraxisTour(options: TourBuildOptions): Tour[] {
  const allSteps: Step[] = [
      {
        icon: "👋",
        title: "Welcome to Praxis",
        content:
          "We'll walk you through the dashboard, show you the library, and build your first simulation together. Takes about 60 seconds.",
        side: "bottom",
        showControls: true,
        showSkip: true,
        pointerPadding: 0,
        pointerRadius: 0,
        disableInteraction: true,
      },
      {
        icon: "✨",
        title: "Build a new simulation",
        content:
          "This is where you spin up a new sim from scratch. We'll head into the builder next so you can see how it works.",
        selector: sel(TOUR_ANCHOR.newSim),
        side: "bottom",
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 12,
        disableInteraction: true,
        nextRoute: "/create",
      },
      {
        icon: "📝",
        title: "Title your simulation",
        content:
          "Give it a memorable name — students see this on their lobby screen and in their reports.",
        selector: sel(TOUR_ANCHOR.createTitle),
        side: "bottom",
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 12,
        disableInteraction: true,
      },
      {
        icon: "🎓",
        title: "Pick a subject",
        content:
          "Praxis tailors language and framing to your discipline — APUSH, cardiology, sales, you name it.",
        selector: sel(TOUR_ANCHOR.createSubject),
        side: "bottom",
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 12,
        disableInteraction: true,
      },
      {
        icon: "📎",
        title: "Drop in your materials",
        content:
          "PDFs, syllabi, articles — or paste text directly below. The AI grounds the simulation in the source you give it.",
        selector: sel(TOUR_ANCHOR.createUpload),
        side: "top",
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 12,
        disableInteraction: true,
      },
      {
        icon: "🎯",
        title: "Tell the AI what you're after",
        content:
          "Spell out what students should wrestle with — the sharper the goal, the sharper the sim.",
        selector: sel(TOUR_ANCHOR.createGoal),
        side: "top",
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 12,
        disableInteraction: true,
      },
      {
        icon: "⚡",
        title: "Generate with AI",
        content:
          "Praxis writes the scenario, decisions, and consequences in under a minute, then drops you into the editor for tweaks.",
        selector: sel(TOUR_ANCHOR.createGenerate),
        side: "top",
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 12,
        disableInteraction: true,
        nextRoute: "/library",
      },
      {
        icon: "📚",
        title: "Or steal from the library",
        content:
          "We've curated hand-authored sims across business, sales, and AP. Duplicate one to your account to remix it.",
        selector: sel(TOUR_ANCHOR.libraryLink),
        side: "bottom",
        showControls: true,
        showSkip: true,
        pointerPadding: 8,
        pointerRadius: 12,
        disableInteraction: true,
      },
      {
        // The heart lives on a small circular button in the top-right corner
        // of a 320px library card. `side: 'right'` would push the (~340px)
        // card past the viewport's right edge on anything narrower than
        // roughly desktop; `side: 'bottom'` keeps it centered under the
        // anchor where the card always fits.
        icon: "❤️",
        title: "Save the ones you love",
        content:
          "Tap the heart on any card to favorite it. Favorites surface on your dashboard for quick recall.",
        selector: sel(TOUR_ANCHOR.favoriteButton),
        side: "bottom",
        showControls: true,
        showSkip: true,
        pointerPadding: 6,
        pointerRadius: 999,
        disableInteraction: true,
      },
      {
        // The avatar sits at the *top-right* of the sticky header. `side:
        // 'bottom'` centers a 340px card beneath it, which spills off the
        // right edge of the viewport. `bottom-right` instead right-aligns
        // the card with the avatar, so it grows leftward into the viewport.
        icon: "👤",
        title: "Account & settings",
        content:
          "Your avatar opens billing, profile, and the option to replay this tour anytime.",
        selector: sel(TOUR_ANCHOR.profileMenu),
        side: "bottom-right",
        showControls: true,
        showSkip: true,
        pointerPadding: 4,
        pointerRadius: 999,
        disableInteraction: true,
      },
      {
        // The Copilot FAB anchors to the *bottom-right* corner of the
        // viewport. `side: 'left'` puts the card *to the left* of the FAB,
        // but on small screens the card can still clip when the FAB sits
        // close to the bottom. `top-right` opens the card above-and-left of
        // the FAB, which always fits regardless of width.
        icon: "💬",
        title: "Open the Copilot",
        content:
          "The chat bubble bottom-right can rewrite a section, suggest a chart, or polish a decision after generation.",
        selector: sel(TOUR_ANCHOR.copilotFab),
        side: "top-right",
        showControls: true,
        showSkip: true,
        pointerPadding: 6,
        pointerRadius: 999,
        disableInteraction: true,
      },
      {
        icon: "🚀",
        title: "You're set",
        content:
          "Generate your first sim, share the join code with your roster, and watch decisions stream in.",
        side: "bottom",
        showControls: true,
        showSkip: false,
        pointerPadding: 0,
        pointerRadius: 0,
        disableInteraction: true,
      },
  ];

  // Selectors used to identify steps we may want to drop. Comparing on
  // `selector` (rather than e.g. step index) keeps this resilient as future
  // steps get added or reordered.
  const FAVORITE_SELECTOR = sel(TOUR_ANCHOR.favoriteButton);

  const steps = allSteps.filter((step) => {
    if (step.selector === FAVORITE_SELECTOR && !options.libraryHasFavoritableSims) {
      return false;
    }
    return true;
  });

  return [{ tour: PRAXIS_TOUR_ID, steps }];
}
