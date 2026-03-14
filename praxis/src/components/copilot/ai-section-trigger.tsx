"use client";

import { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiSectionTriggerProps {
  sectionLabel: string;
  sectionContext: string;
  onFocusSection: (label: string, sectionContext: string) => void;
  active?: boolean;
  children: (trigger: ReactNode) => ReactNode;
}

export function AiSectionTrigger({
  sectionLabel,
  sectionContext,
  onFocusSection,
  active = false,
  children,
}: AiSectionTriggerProps) {
  const triggerButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onFocusSection(sectionLabel, sectionContext);
      }}
      className={cn(
        "flex h-7 w-7 sm:h-6 sm:w-6 items-center justify-center rounded-md transition-all duration-200 shrink-0",
        active
          ? "bg-primary text-primary-foreground animate-copilot-glow"
          : "text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10"
      )}
      title={`Use AI to edit ${sectionLabel}`}
    >
      <Sparkles className="h-3.5 w-3.5" />
    </button>
  );

  return children(triggerButton);
}
