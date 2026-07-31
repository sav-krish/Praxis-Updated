"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SimulationEntryModal,
  SimulationOnboardingCarousel,
  type OnboardingScreenId,
} from "@/components/simulation/preface-modal";
import { SimulationAssistant } from "@/components/simulation/simulation-assistant";

export default function StudentExperiencePreviewPage() {
  const [entryOpen, setEntryOpen] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [screen, setScreen] = useState<OnboardingScreenId>("how-it-works");
  const [entryHelpPortalTarget, setEntryHelpPortalTarget] =
    useState<HTMLDivElement | null>(null);
  const [onboardingHelpPortalTarget, setOnboardingHelpPortalTarget] =
    useState<HTMLDivElement | null>(null);

  return (
    <main data-app="true" className="min-h-dvh bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-4xl items-center justify-between rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm text-muted-foreground">Decision 1 of 3</p>
          <h1 className="text-xl font-bold">Sustainable Energy Transition</h1>
        </div>
        <ThemeToggle />
      </div>
      <div className="mx-auto mt-6 max-w-4xl rounded-2xl border bg-card p-8">
        <p className="text-muted-foreground">
          Visual QA surface for the student experience overlays.
        </p>
        <Button className="mt-4" onClick={() => setEntryOpen(true)}>
          Reopen entry
        </Button>
      </div>

      <SimulationEntryModal
        open={entryOpen}
        title="Sustainable Energy Transition"
        summary="You are leading an energy program through a high-stakes transition. Balance people, cost, and long-term performance as you make each decision."
        roleLabel="Energy Program Director"
        decisionCount={3}
        estimatedMinutes={25}
        isNew
        onStart={() => setEntryOpen(false)}
        onReview={() => {
          setEntryOpen(false);
          setScreen("how-it-works");
          setOnboardingOpen(true);
        }}
        onHelpPortalTargetChange={setEntryHelpPortalTarget}
      />
      <SimulationOnboardingCarousel
        open={onboardingOpen}
        decisionCount={3}
        classVotesEnabled
        leaderboardEnabled
        individualMode={false}
        startScreen={screen}
        onExit={() => setOnboardingOpen(false)}
        onHelpPortalTargetChange={setOnboardingHelpPortalTarget}
      />
      <SimulationAssistant
        sessionKey="visual-qa"
        decisionCount={3}
        classVotesEnabled
        leaderboardEnabled
        onOpenOnboarding={(nextScreen) => {
          setScreen(nextScreen);
          setOnboardingOpen(true);
        }}
        helpPortalTarget={
          onboardingOpen
            ? onboardingHelpPortalTarget
            : entryOpen
              ? entryHelpPortalTarget
              : null
        }
        onReturnToSimulation={
          entryOpen
            ? () => setEntryOpen(false)
            : onboardingOpen
              ? () => setOnboardingOpen(false)
              : undefined
        }
      />
    </main>
  );
}
