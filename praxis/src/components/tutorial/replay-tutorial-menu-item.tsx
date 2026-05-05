"use client";

import { useRouter, usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useNextStep } from "nextstepjs";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { resetTutorial } from "@/components/tutorial/actions";
import {
  isDashboardRoute,
  requestTourReplay,
} from "@/components/tutorial/tour-provider";
import { PRAXIS_TOUR_ID } from "@/components/tutorial/tour-config";

/**
 * Avatar-dropdown entry that re-arms the dashboard tour.
 *
 * Two start paths because the tour begins on `/dashboard`:
 *   - Already on `/dashboard`: call `startNextStep` directly so the overlay
 *     pops immediately (no navigation round-trip).
 *   - Anywhere else: set a one-shot session-storage flag and `router.push`
 *     to `/dashboard`. `<TourAutoStart>` picks it up after the route lands.
 *
 * We await `resetTutorial()` so production reflects the cleared flag, then
 * start the tour on a microtask so the overlay wins any React 19 / RSC batch
 * from the server action.
 */
export function ReplayTutorialMenuItem() {
  const router = useRouter();
  const pathname = usePathname();
  const { startNextStep } = useNextStep();

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        void (async () => {
          try {
            await resetTutorial();
          } catch {
            /* replay UX must not hinge on reset succeeding */
          }
          // Defer until after the server action / RSC pass settles — in production
          // React 19 can batch updates such that starting the tour in the same
          // tick as the action leaves the overlay in a bad state.
          queueMicrotask(() => {
            if (isDashboardRoute(pathname)) {
              startNextStep(PRAXIS_TOUR_ID);
              return;
            }
            requestTourReplay();
            router.push("/dashboard");
          });
        })();
      }}
      className="cursor-pointer"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      Replay tutorial
    </DropdownMenuItem>
  );
}
