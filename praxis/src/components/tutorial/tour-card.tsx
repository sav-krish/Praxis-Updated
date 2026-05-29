"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { CardComponentProps } from "nextstepjs";

/**
 * Custom NextStep card matching Praxis design language. Replaces the library's
 * default card so branding stays consistent end-to-end.
 *
 * Layout:
 *   - Step counter (top-left) + close button (top-right)
 *   - Icon + title
 *   - Body content
 *   - Skip / Back / Next controls (bottom)
 *   - NextStep's `arrow` slot — auto-positioned by the library so the card
 *     visually points back at the spotlight.
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const showControls = step.showControls !== false;
  const showSkip = step.showSkip !== false && skipTour && !isLast;

  return (
    <div className="w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(128,52,20,0.22)]">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#f9792a]">
          {step.icon != null && step.icon !== "" && (
            <span aria-hidden className="text-base leading-none">
              {step.icon}
            </span>
          )}
          Step {currentStep + 1} of {totalSteps}
        </span>
        {skipTour && (
          <button
            type="button"
            onClick={skipTour}
            aria-label="Skip tour"
            className="rounded-full p-1 text-muted-text transition-colors hover:bg-[#fff1e5] hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <h2 className="text-base font-semibold text-ink">{step.title}</h2>
      <div className="mt-1 text-sm leading-relaxed text-muted-text">
        {step.content}
      </div>

      {showControls && (
        <div className="mt-4 flex items-center justify-between gap-2">
          {showSkip ? (
            <button
              type="button"
              onClick={skipTour}
              className="text-xs text-muted-text transition-colors hover:text-ink"
            >
              Skip tour
            </button>
          ) : (
            <span aria-hidden />
          )}

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-[#fff6ee]"
                aria-label="Previous step"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#f9792a] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#f76224]"
            >
              {isLast ? "Finish" : "Next"}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {arrow}
    </div>
  );
}
