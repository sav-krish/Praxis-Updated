"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Brain, TrendingUp, AlertTriangle, CheckCircle, MessageSquare, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";

interface ConsequenceFeedbackProps {
  decisionTitle: string;
  decisionNumber: number;
  selectedOptionLabel: string;
  selectedOptionTitle: string;
  consequence: string;
  reasoningAnalysis?: string | null;
  aiJustificationFeedback?: string | null;
  dataImpact?: {
    metric: string;
    change: string;
    direction: "up" | "down" | "neutral";
  }[];
  outcomeRating?: "strong" | "decent" | "mixed" | "poor" | null;
  outcomeLabel?: string | null;
  classVotes?: {
    total: number;
    optionA: number;
    optionB: number;
    optionC: number;
  } | null;
  roleVotes?: {
    roleName: string;
    optionA: number;
    optionB: number;
    optionC: number;
  }[];
  topJustifications?: {
    optionLabel: string;
    texts: string[];
  }[];
  showVotingResults?: boolean;
  showRoleBreakdown?: boolean;
  showTopJustifications?: boolean;
  showClassroomNotice?: boolean;
  isIndividualMode?: boolean;
  onNext: () => void;
  onViewScenario?: () => void;
  isLastDecision: boolean;
  loadingConsequence?: boolean;
}

export function ConsequenceFeedback({
  decisionTitle,
  decisionNumber,
  selectedOptionLabel,
  selectedOptionTitle,
  consequence,
  reasoningAnalysis,
  aiJustificationFeedback,
  dataImpact,
  outcomeRating,
  outcomeLabel,
  classVotes,
  roleVotes,
  topJustifications,
  showVotingResults = false,
  showRoleBreakdown = false,
  showTopJustifications = false,
  showClassroomNotice = true,
  isIndividualMode = false,
  onNext,
  onViewScenario,
  isLastDecision,
  loadingConsequence = false,
}: ConsequenceFeedbackProps) {
  const [revealed, setRevealed] = useState(false);
  const impacts = dataImpact ?? [];

  useEffect(() => {
    if (showVotingResults) {
      const t = window.setTimeout(() => setRevealed(true), 120);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setRevealed(false), 0);
    return () => window.clearTimeout(t);
  }, [showVotingResults, decisionNumber, classVotes]);

  const totalClass = classVotes?.total || 0;
  const counts = classVotes
    ? { A: classVotes.optionA, B: classVotes.optionB, C: classVotes.optionC }
    : { A: 0, B: 0, C: 0 };

  const pct = (n: number) => (totalClass > 0 ? Math.round((n / totalClass) * 100) : 0);
  const maxCount = Math.max(counts.A, counts.B, counts.C, 1);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Header */}
      {impacts.length > 0 && <Card className="dark:border-zinc-700 dark:bg-zinc-900">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="dark:text-zinc-300 dark:bg-zinc-800">
                  <Brain className="h-3 w-3 mr-1" />
                  Consequence
                </Badge>
                <Badge className="dark:bg-amber-600 dark:text-white">
                  Decision {decisionNumber}
                </Badge>
              </div>
              <CardTitle className="text-lg sm:text-xl dark:text-zinc-100">
                {decisionTitle}
              </CardTitle>
              <CardDescription className="dark:text-zinc-400">
                You chose: <strong className="text-zinc-700 dark:text-zinc-200">{selectedOptionLabel}. {selectedOptionTitle}</strong>
              </CardDescription>
            </div>
            {outcomeLabel && (
              <Badge className={
                outcomeRating === "strong" ? "bg-emerald-600 text-white" :
                outcomeRating === "decent" ? "bg-emerald-500 text-white" :
                outcomeRating === "mixed" ? "bg-amber-500 text-white" :
                "bg-red-500 text-white"
              }>
                {outcomeLabel}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>}

      {/* 1. AI Justification Feedback (Individual Mode) */}
      {isIndividualMode && aiJustificationFeedback && (
        <Card className="dark:border-zinc-700 dark:bg-zinc-900 border-violet-200 dark:border-violet-800">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-900/40">
                <Lightbulb className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <CardTitle className="text-sm dark:text-zinc-100">AI Review of Your Reasoning</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-0">
            <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/50">
              <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed">
                {aiJustificationFeedback}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1b. Reasoning Analysis (from pre-written content) */}
      {reasoningAnalysis && !aiJustificationFeedback && (
        <Card className="dark:border-zinc-700 dark:bg-zinc-900">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/40">
                <CheckCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-sm dark:text-zinc-100">Reasoning Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pt-0">
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {reasoningAnalysis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 1.5 Anonymous Vote Reveal */}
      {showVotingResults && (
        <Card className="dark:border-zinc-700 dark:bg-zinc-900">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-900/40">
                    <CheckCircle className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <CardTitle className="text-sm dark:text-zinc-100">How the Class Voted</CardTitle>
                </div>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">100% anonymous aggregate</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{totalClass} submitted</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{totalClass === 0 ? "0%" : "100%"} of your class</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 space-y-3">
            {(["A", "B", "C"] as const).map((label) => {
              const count = counts[label];
              const percentage = pct(count);
              const isChosen = selectedOptionLabel === label;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Option {label}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{percentage}% · {count} vote{count === 1 ? "" : "s"}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={[
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        isChosen
                          ? "bg-amber-500 dark:bg-amber-400"
                          : "bg-indigo-500 dark:bg-indigo-400",
                      ].join(" ")}
                      style={{ width: revealed ? `${(count / maxCount) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              );
            })}

            {showRoleBreakdown && roleVotes && roleVotes.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Votes by Role</p>
                {roleVotes.map((role) => {
                  const rTotal = role.optionA + role.optionB + role.optionC;
                  const rPct = (n: number) => (rTotal > 0 ? Math.round((n / rTotal) * 100) : 0);
                  return (
                    <div key={role.roleName} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="secondary" className="text-xs">{role.roleName}</Badge>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{rTotal} voter{rTotal === 1 ? "" : "s"}</span>
                      </div>
                      {(["A", "B", "C"] as const).map((label) => {
                        const rCount = label === "A" ? role.optionA : label === "B" ? role.optionB : role.optionC;
                        return (
                          <div key={label} className="flex items-center gap-2 text-xs">
                            <span className="w-4 shrink-0">{label}.</span>
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-1000 ease-out" style={{ width: revealed ? `${rPct(rCount)}%` : "0%" }} />
                            </div>
                            <span className="w-16 text-right tabular-nums text-zinc-500 dark:text-zinc-400">{rPct(rCount)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {showTopJustifications && topJustifications && topJustifications.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Top Justifications from Your Class</p>
                {topJustifications.map((group) => (
                  <div key={group.optionLabel} className="space-y-1">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Option {group.optionLabel}</p>
                    {group.texts.slice(0, 3).map((text, idx) => (
                      <p key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">&ldquo;{text}&rdquo;</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Direct Consequence */}
      <Card className="dark:border-zinc-700 dark:bg-zinc-900">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/40">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-sm dark:text-zinc-100">
              {loadingConsequence ? "Generating Consequence..." : "What Happened Next"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/80">
            {loadingConsequence ? (
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Analyzing your decision and generating tailored consequences...
                </p>
              </div>
            ) : (
              <p className="text-sm sm:text-base text-zinc-700 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                {consequence || "Your choice has been recorded. The consequences of your decision are outlined below."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Data Impact */}
      <Card className="dark:border-zinc-700 dark:bg-zinc-900">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/40">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-sm dark:text-zinc-100">Decision Impact</CardTitle>
                <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">Real-world ripple from this choice</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {impacts.map((impact) => (
              <div
                key={impact.metric}
                className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 text-center"
              >
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{impact.metric}</p>
                <p className={[
                  "text-lg font-bold",
                  impact.direction === "up"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : impact.direction === "down"
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-600 dark:text-zinc-300",
                ].join(" ")}>
                  {impact.change}
                </p>
              </div>
            ))}
          </div>

          {aiJustificationFeedback && (
            <div className="mt-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/50">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">Reasoning Feedback Loop</p>
              <p className="text-xs text-violet-800 dark:text-violet-200 leading-relaxed">{aiJustificationFeedback}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classroom Mode Notice */}
      {showClassroomNotice && (
        <Card className="dark:border-zinc-700 dark:bg-zinc-900 border-blue-200 dark:border-blue-800">
          <CardContent className="px-4 sm:px-6 py-3">
            <div className="flex items-start gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-zinc-600 dark:text-zinc-300">
                <strong className="text-zinc-900 dark:text-zinc-100">Instructor review:</strong>{" "}
                Your justification will be visible to your instructor for evaluation.
                Make sure your reasoning is clear and well-structured.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Mode Notice */}
      {isIndividualMode && !showClassroomNotice && (
        <Card className="dark:border-zinc-700 dark:bg-zinc-900 border-emerald-200 dark:border-emerald-800">
          <CardContent className="px-4 sm:px-6 py-3">
            <div className="flex items-start gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-zinc-600 dark:text-zinc-300">
                <strong className="text-zinc-900 dark:text-zinc-100">Self-paced learning:</strong>{" "}
                Your justification was reviewed by AI. Use the feedback above to strengthen your reasoning
                in future decisions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        {onViewScenario && (
          <Button
            variant="outline"
            onClick={onViewScenario}
            className="min-h-[44px] w-full sm:w-auto dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <BookOpen className="mr-2 h-4 w-4 shrink-0" />
            View scenario
          </Button>
        )}
        <div className="flex-1" />
        <Button
          size="lg"
          onClick={onNext}
          disabled={loadingConsequence}
          className="min-h-[48px] w-full sm:w-auto"
        >
          {isLastDecision ? "View Final Epilogue →" : "Proceed to Next Decision →"}
          <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </div>
    </div>
  );
}
