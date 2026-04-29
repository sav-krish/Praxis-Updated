"use client";

import { useRouter, usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useNextStep } from "nextstepjs";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { resetTutorial } from "@/components/tutorial/actions";
import {
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
 * The DB reset is fire-and-forget — the in-memory tour state is what drives
 * the overlay, and we don't want a flaky network call to gate the UX.
 */
export function ReplayTutorialMenuItem() {
  const router = useRouter();
  const pathname = usePathname();
  const { startNextStep } = useNextStep();

  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        void resetTutorial().catch(() => {
          /* swallow — replay shouldn't depend on the network */
        });

        if (pathname === "/dashboard") {
          startNextStep(PRAXIS_TOUR_ID);
          return;
        }

        requestTourReplay();
        router.push("/dashboard");
      }}
      className="cursor-pointer"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      Replay tutorial
    </DropdownMenuItem>
  );
}
