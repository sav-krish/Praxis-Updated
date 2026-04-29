"use client";

import { createContext, useContext } from "react";

export type Step = {
  icon?: React.ReactNode;
  title: string;
  content: React.ReactNode;
  selector?: string;
  side?: string;
  showControls?: boolean;
  showSkip?: boolean;
  pointerPadding?: number;
  pointerRadius?: number;
  disableInteraction?: boolean;
  nextRoute?: string;
};

export type Tour = {
  tour: string;
  steps: Step[];
};

export type CardComponentProps = {
  step: Step;
  currentStep: number;
  totalSteps: number;
  nextStep?: () => void;
  prevStep?: () => void;
  skipTour?: () => void;
  arrow?: React.ReactNode;
};

type NextStepContextValue = {
  startNextStep: (_tourId: string) => void;
  isNextStepVisible: boolean;
  currentStep: number;
  currentTour: string | null;
  setCurrentStep: (_step: number) => void;
  closeNextStep: () => void;
};

const NextStepContext = createContext<NextStepContextValue>({
  startNextStep: () => {},
  isNextStepVisible: false,
  currentStep: 0,
  currentTour: null,
  setCurrentStep: () => {},
  closeNextStep: () => {},
});

export function NextStepProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextStepContext.Provider
      value={{
        startNextStep: () => {},
        isNextStepVisible: false,
        currentStep: 0,
        currentTour: null,
        setCurrentStep: () => {},
        closeNextStep: () => {},
      }}
    >
      {children}
    </NextStepContext.Provider>
  );
}

type NextStepProps = {
  children: React.ReactNode;
  steps: Tour[];
  cardComponent?: React.ComponentType<CardComponentProps>;
  shadowRgb?: string;
  shadowOpacity?: string;
  cardTransition?: unknown;
  displayArrow?: boolean;
  clickThroughOverlay?: boolean;
  scrollToTop?: boolean;
  disableConsoleLogs?: boolean;
  overlayZIndex?: number;
  onComplete?: () => void;
  onSkip?: () => void;
};

export function NextStep({ children }: NextStepProps) {
  return <>{children}</>;
}

export function useNextStep() {
  return useContext(NextStepContext);
}
