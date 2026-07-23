"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Zap, Users, CheckCircle, Lightbulb, MessageSquare, BookOpen } from "lucide-react";
import { LeaderboardPanel } from "@/components/simulation/leaderboard-panel";

export interface Option {
  id: string;
  label: string;
  title: string;
  description: string | null;
  consequence: string | null;
  score: number;
}

export interface Decision {
  id: string;
  order_num: number;
  prompt: string;
  options: Option[];
}

interface OptionCardVoteCount {
  optionId: string;
  count: number;
}

interface DecisionPageProps {
  decision: Decision;
  decisionIndex: number;
  totalDecisions: number;
  selectedOption: string | null;
  onSelectOption: (optionId: string) => void;
  justification: string;
  onJustificationChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  roleAdvice?: string | null;
  roleLabel?: string | null;
  voteCounts?: OptionCardVoteCount[];
  totalVotes?: number;
  liveVotingEnabled?: boolean;
  isClassroomMode?: boolean;
  isIndividualMode?: boolean;
  showLeaderboard?: boolean;
  allDecisions?: Decision[];
  participants?: { id: string; profile_id: string | null; team_id?: string | null }[];
  profiles?: { id: string; profile_name: string }[];
  teamDecisions?: { decision_id: string; option_id: string; team_id: string | null }[];
  mode?: "individual" | "teams";
}

export function DecisionPage({
  decision,
  decisionIndex,
  totalDecisions,
  selectedOption,
  onSelectOption,
  justification,
  onJustificationChange,
  onSubmit,
  submitting,
  roleAdvice,
  roleLabel,
  voteCounts,
  totalVotes = 0,
  liveVotingEnabled = false,
  isClassroomMode = false,
  isIndividualMode = false,
  showLeaderboard = false,
  allDecisions = [],
  participants = [],
  profiles = [],
  teamDecisions = [],
  mode = "individual",
}: DecisionPageProps) {
  const isLastDecision = decisionIndex === totalDecisions - 1;

  const getVotePercentage = (count: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((count / totalVotes) * 100);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Top Progress Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="dark:text-zinc-300 dark:bg-zinc-800">
            Decision {decision.order_num} of {totalDecisions}
          </Badge>
          {/* Progress Dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalDecisions }).map((_, i) => (
              <div
                key={i}
                className={[
                  "h-2 w-2 rounded-full transition-colors",
                  i < decisionIndex
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : i === decisionIndex
                      ? "bg-amber-500 dark:bg-amber-400"
                      : "bg-zinc-200 dark:bg-zinc-700",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
        <Badge className="dark:bg-amber-600 dark:text-white">
          <Zap className="h-3 w-3 mr-1" />
          +65XP
        </Badge>
      </div>

      {/* Role Callout Banner */}
      {roleAdvice && roleLabel && (
        <div className="rounded-lg border-l-4 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                {roleLabel}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">
                {roleAdvice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Decision Prompt */}
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold leading-snug text-zinc-900 dark:text-zinc-100 break-words">
          {decision.prompt}
        </h2>
      </div>

      {/* Options */}
      <Card className="dark:border-zinc-700 dark:bg-zinc-900">
        <CardContent className="space-y-3 px-4 sm:px-6 pt-5">
          <RadioGroup
            value={selectedOption || ""}
            onValueChange={onSelectOption}
          >
            {decision.options.map((option) => {
              const voteCount = voteCounts?.find((v) => v.optionId === option.id);
              const percentage = voteCount ? getVotePercentage(voteCount.count) : 0;
              return (
                <div key={option.id}>
                  <div
                    className={[
                      "rounded-xl border-2 transition-all duration-200",
                      selectedOption === option.id
                        ? "border-amber-500/60 dark:border-amber-400/60 bg-amber-50/50 dark:bg-amber-900/10 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600",
                    ].join(" ")}
                  >
                    <div
                      className="flex items-start gap-3 p-3 sm:p-4 min-h-[48px] cursor-pointer"
                      onClick={() => onSelectOption(option.id)}
                    >
                      <RadioGroupItem
                        value={option.id}
                        id={option.id}
                        className="mt-0.5 shrink-0 dark:text-zinc-400"
                      />
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor={option.id}
                          className="cursor-pointer break-words text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:text-[15px]"
                        >
                          {option.label}. {option.title}
                        </Label>
                        {option.description && (
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-sm">
                            {option.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Vote Bar */}
                  {liveVotingEnabled && voteCount && totalVotes > 0 && (
                    <div className="mt-1 mb-2 px-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="font-medium tabular-nums">{percentage}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Live Voting Counter */}
      {liveVotingEnabled && (
        <Card className="dark:border-zinc-700 dark:bg-zinc-900">
          <CardContent className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <Users className="h-4 w-4 text-amber-500" />
                <span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{totalVotes}</strong> of{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">24</strong> locked in
                </span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalVotes, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
                {totalVotes > 8 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
                    +{totalVotes - 8}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Justification */}
      <Collapsible defaultOpen className="group">
        <Card className="dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden p-0 gap-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full text-left px-4 sm:px-6 py-4 min-h-[48px] flex items-center justify-between gap-3 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                <CheckCircle className="h-4 w-4 inline mr-1.5" />
                Add justification
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-6 pb-5 pt-0 border-t border-zinc-100 dark:border-zinc-800">
              {/* Classroom / Teacher Mode Notice */}
              {isClassroomMode && (
                <div className="flex items-start gap-2 pt-3 pb-2 text-xs text-blue-600 dark:text-blue-400">
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <p>
                    <strong>Instructor review:</strong> Your justification will be visible to your instructor for evaluation.
                  </p>
                </div>
              )}

              {/* Individual / Self-Paced Mode Notice */}
              {isIndividualMode && (
                <div className="flex items-start gap-2 pt-3 pb-2 text-xs text-violet-600 dark:text-violet-400">
                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <p>
                    <strong>AI feedback:</strong> Your justification will be reviewed by AI to help strengthen your reasoning.
                  </p>
                </div>
              )}

              <div className="pt-1">
                <Label htmlFor="justification" className="sr-only">Justification</Label>
                <Textarea
                  id="justification"
                  placeholder="Your reasoning (required to submit)"
                  value={justification}
                  onChange={(e) => onJustificationChange(e.target.value)}
                  rows={4}
                  className="resize-none dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
                <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  Explain why you chose this option and how it aligns with your role.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Leaderboard */}
      {showLeaderboard && liveVotingEnabled && (
        <LeaderboardPanel
          decisions={allDecisions}
          participants={participants}
          profiles={profiles}
          teamDecisions={teamDecisions}
          mode={mode}
          currentDecisionId={decision.id}
        />
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={!selectedOption || !justification.trim() || submitting}
          className="shadow-sm min-h-[48px] w-full sm:w-auto"
        >
          {submitting ? "Submitting..." : isLastDecision ? "Submit Final Decision" : "Submit & Continue"}
        </Button>
      </div>
    </div>
  );
}
