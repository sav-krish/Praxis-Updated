"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  NextStep,
  NextStepProvider,
  useNextStep,
} from "@/components/tutorial/nextstep-compat";
import type { Tour } from "@/components/tutorial/nextstep-compat";
import { buildPraxisTour, PRAXIS_TOUR_ID } from "@/components/tutorial/tour-config";
import { TourCard } from "@/components/tutorial/tour-card";
import { markTutorialCompleted } from "@/components/tutorial/actions";

const REPLAY_FLAG = "praxis-tour-replay";

/**
 * Upper bound on how long we wait for a step's anchor to appear in the DOM
 * before treating it as missing and auto-skipping. 1800ms covers worst-case
 * cross-page navigations + dynamic imports (e.g. the lazy-loaded Copilot
 * FAB) without leaving the user staring at a card pointing at nothing.
 */
const STEP_ANCHOR_RESOLVE_TIMEOUT_MS = 1800;

/**
 * Sets a one-shot session flag so `<TourAutoStart>` picks the tour up after
 * the avatar's "Replay tutorial" item navigates the user to /dashboard.
 *
 * Lives in module scope so the replay menu item (a sibling client component
 * outside this provider's tree) can flip it without needing the context.
 */
export function requestTourReplay() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(REPLAY_FLAG, "1");
}

interface TourProviderProps {
  children: React.ReactNode;
  /** `true` when `professors.tutorial_completed_at` is set. */
  tutorialCompleted: boolean;
  /**
   * `true` iff the public library has at least one simulation. Drives whether
   * the favorite-step is included in the tour at all — when the library is
   * empty there's no heart icon to spotlight, so showing the step would
   * point the card at nothing.
   */
  libraryHasFavoritableSims: boolean;
}

/**
 * Wraps every `(dashboard)` route with `nextstepjs`. The provider is
 * intentionally always mounted so the tour state survives in-app
 * navigations (Next.js's App Router only re-renders the route segment, not
 * the layout).
 *
 * Persistence model:
 *   - Source of truth: `professors.tutorial_completed_at` in Postgres.
 *   - On `onComplete` and `onSkip`, we fire-and-forget the server action
 *     so cross-device replays work without depending on localStorage.
 *   - Replay is a one-shot session-storage flag (see `requestTourReplay`)
 *     consumed by `<TourAutoStart>` after navigation lands on /dashboard.
 *
 * Conditional steps:
 *   `buildPraxisTour({ libraryHasFavoritableSims })` filters out steps
 *   whose anchor we know up-front won't exist (e.g. the favorite step when
 *   the library is empty). This is preferred over runtime-skipping (the
 *   `<StepAnchorGate>` watchdog still exists, but only as a safety net for
 *   anchors whose presence we can't determine from server data — like the
 *   lazy-loaded Copilot FAB during route hydration).
 */
export function TourProvider({
  children,
  tutorialCompleted,
  libraryHasFavoritableSims,
}: TourProviderProps) {
  const handleComplete = () => {
    void markTutorialCompleted().catch(() => {
      /* Non-blocking — the in-memory tour state has already advanced. */
    });
  };

  // Memoize so re-renders of `<TourProvider>` don't churn the steps array
  // identity and re-mount NextStep's internal state.
  const tour = useMemo(
    () => buildPraxisTour({ libraryHasFavoritableSims }),
    [libraryHasFavoritableSims],
  );

  return (
    <NextStepProvider>
      <NextStep
        steps={tour}
        cardComponent={TourCard}
        shadowRgb="15, 36, 71"
        shadowOpacity="0.55"
        cardTransition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        displayArrow
        clickThroughOverlay={false}
        scrollToTop={false}
        disableConsoleLogs
        overlayZIndex={100}
        onComplete={handleComplete}
        onSkip={handleComplete}
      >
        <TourAutoStart tutorialCompleted={tutorialCompleted} />
        <StepAnchorGate tour={tour} />
        {children}
      </NextStep>
    </NextStepProvider>
  );
}

/**
 * Bridges DB state + session-storage replay flag into NextStep's imperative
 * `startNextStep` API. Renders nothing.
 *
 * The two start triggers are intentionally separate effects so each one can
 * fire exactly once with its own ref guard:
 *   1. First-time auto-start: when the user lands on `/dashboard` and the DB
 *      has not recorded `tutorial_completed_at`.
 *   2. Replay: when `requestTourReplay()` set the session flag (the avatar
 *      menu route-pushes to `/dashboard` right after).
 */
function TourAutoStart({ tutorialCompleted }: { tutorialCompleted: boolean }) {
  const { startNextStep, isNextStepVisible } = useNextStep();
  const pathname = usePathname();
  const autoStarted = useRef(false);
  const replayHandled = useRef(false);

  // First-time auto-start.
  useEffect(() => {
    if (tutorialCompleted) return;
    if (autoStarted.current) return;
    if (isNextStepVisible) return;
    if (pathname !== "/dashboard") return;
    autoStarted.current = true;
    startNextStep(PRAXIS_TOUR_ID);
  }, [tutorialCompleted, pathname, isNextStepVisible, startNextStep]);

  // Replay handoff from the avatar menu.
  useEffect(() => {
    if (replayHandled.current) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(REPLAY_FLAG) !== "1") return;
    if (pathname !== "/dashboard") return;
    replayHandled.current = true;
    window.sessionStorage.removeItem(REPLAY_FLAG);
    startNextStep(PRAXIS_TOUR_ID);
  }, [pathname, startNextStep]);

  return null;
}

/**
 * Defense-in-depth watchdog for steps whose anchor we *can't* know about
 * up-front (so they couldn't be filtered out by `buildPraxisTour`). The
 * canonical case is the lazy-loaded Copilot FAB, which mounts a few
 * frames after route hydration: at the moment the tour reaches that step
 * the selector may not yet resolve, even though we expect it to.
 *
 * Anchors whose existence is *known server-side* (e.g. "is the library
 * empty?") are handled before the tour ever starts by passing the
 * appropriate flags into `buildPraxisTour` — we never want users to see
 * a card pointing at an absent element, even briefly.
 *
 * Behaviour:
 *   1. On every step change, immediately check whether the selector
 *      already resolves. If so, do nothing — `nextstepjs` will spotlight
 *      it normally.
 *   2. Otherwise, set up a `MutationObserver` on `document.body` and a
 *      ${@link STEP_ANCHOR_RESOLVE_TIMEOUT_MS}ms timeout. If the element
 *      appears before the timeout (e.g. cross-page nav still hydrating,
 *      lazy-loaded Copilot FAB still mounting), we cancel and let the
 *      library do its thing.
 *   3. If the timeout fires first, we treat the anchor as permanently
 *      missing and advance to the next step. If we were on the last step,
 *      we close the tour cleanly. The next step's render re-runs this
 *      effect, so cascading skips Just Work for back-to-back missing
 *      anchors.
 */
function StepAnchorGate({ tour: tours }: { tour: Tour[] }) {
  const { currentStep, currentTour, isNextStepVisible, setCurrentStep, closeNextStep } =
    useNextStep();

  useEffect(() => {
    if (!isNextStepVisible) return;
    if (typeof document === "undefined") return;

    const tour = tours.find((t) => t.tour === currentTour);
    if (!tour) return;
    const step = tour.steps[currentStep];
    if (!step?.selector) return;
    const selector = step.selector;
    if (document.querySelector(selector)) return;

    let resolved = false;
    const advance = () => {
      if (resolved) return;
      resolved = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);
      const next = currentStep + 1;
      if (next < tour.steps.length) {
        setCurrentStep(next);
      } else {
        closeNextStep();
      }
    };

    const observer = new MutationObserver(() => {
      if (resolved) return;
      if (document.querySelector(selector)) {
        resolved = true;
        observer.disconnect();
        window.clearTimeout(timeoutId);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeoutId = window.setTimeout(advance, STEP_ANCHOR_RESOLVE_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [currentStep, currentTour, isNextStepVisible, setCurrentStep, closeNextStep, tours]);

  return null;
}
