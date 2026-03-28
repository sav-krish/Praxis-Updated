"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function usePrefersHoverTooltip() {
  const [ready, setReady] = useState(false);
  const [useTooltip, setUseTooltip] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setUseTooltip(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    setReady(true);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return { ready, useTooltip };
}

export type FieldInfoHintProps = {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

/**
 * Info (i) control: tooltip on hover for fine pointers, popover on tap for touch.
 */
export function FieldInfoHint({
  children,
  className,
  side = "top",
  align = "center",
}: FieldInfoHintProps) {
  const { ready, useTooltip } = usePrefersHoverTooltip();

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
        className
      )}
      aria-label="More information"
    >
      <Info className="h-4 w-4" aria-hidden />
    </Button>
  );

  if (!ready || !useTooltip) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          className="max-w-xs text-sm text-pretty"
        >
          {children}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-xs text-sm leading-snug text-pretty"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
