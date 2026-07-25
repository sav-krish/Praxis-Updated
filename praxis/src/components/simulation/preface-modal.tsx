"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  ListChecks,
  Users,
  GraduationCap,
  ArrowRight,
  Target,
  Star,
  BarChart,
  Brain,
  Building2,
} from "lucide-react";

interface PrefaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioTitle: string;
  scenarioSummary?: string | null;
  estimatedMinutes?: number | null;
  decisionCount?: number;
  classCount?: number;
  roleLabel?: string | null;
}

const steps = [
  {
    number: 1,
    title: "Get assigned a role",
    description: "CFO, Marketing Lead, or Customer Rep \u2014 each role shapes your argument.",
  },
  {
    number: 2,
    title: "Read the briefing",
    description: "Slack thread, live dashboard, and full scenario doc with real data.",
  },
  {
    number: 3,
    title: "Make 3 decisions",
    description: "Pick an answer, justify it, and see class votes in real time.",
  },
  {
    number: 4,
    title: "See the consequences",
    description: "Find out what happened to the company months later.",
  },
];

const scoringPoints = [
  {
    icon: Target,
    title: "Decision Impact (0-3 pts each)",
    description: "Each decision is scored based on how well it aligns with scenario goals. Strong choices earn 3 points, partial choices earn 2, and off-track choices earn 1.",
  },
  {
    icon: Brain,
    title: "Justification Quality",
    description: "Your written reasoning demonstrates critical thinking. In individual mode, AI reviews your logic and highlights strong points or overlooked factors.",
  },
  {
    icon: BarChart,
    title: "Immediate & Long-Term Consequences",
    description: "Every decision triggers real-time consequences that affect downstream metrics. Good choices early open up better options later.",
  },
  {
    icon: Star,
    title: "Total Score & Reflection",
    description: "Your final score is the sum of all decision scores out of the maximum possible. Reflection answers help cement learning but don't affect your score.",
  },
];

export function PrefaceModal({
  open,
  onOpenChange,
  scenarioTitle,
  scenarioSummary,
  estimatedMinutes = 15,
  decisionCount = 3,
  classCount = 24,
  roleLabel,
}: PrefaceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-zinc-900 dark:border-zinc-700">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <Building2 className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            </div>
            <Badge variant="secondary" className="dark:text-zinc-300 dark:bg-zinc-800">
              <GraduationCap className="h-3 w-3 mr-1" />
              Simulation
            </Badge>
            {roleLabel && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border-0">
                <Users className="h-3 w-3 mr-1" />
                {roleLabel}
              </Badge>
            )}
          </div>
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Before You Begin
          </p>
          <DialogTitle className="text-xl sm:text-2xl dark:text-zinc-100">
            {scenarioTitle}
          </DialogTitle>
          <DialogDescription className="text-sm dark:text-zinc-400">
            {scenarioSummary || "Before you begin, here's what to expect in this interactive simulation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 4-Step Outline Grid */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
              Your Journey
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-sm font-bold text-amber-700 dark:text-amber-400">
                    {step.number}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {step.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How Scoring Works */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/40">
                <Star className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                How Scoring Works
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scoringPoints.map((point, index) => {
                const Icon = point.icon;
                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                        <Icon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {point.title}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {point.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="dark:bg-zinc-700" />

          {/* Footer Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>~{estimatedMinutes} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ListChecks className="h-4 w-4" />
              <span>{decisionCount} decisions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{classCount} in class</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="min-h-[48px] px-6 text-base w-full sm:w-auto"
            >
              Got it, let&apos;s start
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
