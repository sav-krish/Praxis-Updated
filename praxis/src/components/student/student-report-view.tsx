"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Trophy, Users, MessageSquare } from "lucide-react";
import { FadeIn } from "@/components/landing/fade-in";
import { APP_TILE_BACKGROUNDS } from "@/lib/app-tile-backgrounds";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import type { DecisionExplanation } from "@/lib/student/explanations";

type StudentReportViewProps = {
  simulationTitle: string;
  score: number;
  teamScore: number | null;
  completedAt: string | null;
  decisions: DecisionExplanation[];
  reflectionResponses: { question: string; response: string }[];
  attemptId: string;
  sessionId: string;
};

function qualityBadgeClass(quality: DecisionExplanation["quality"]): string {
  if (quality === "strong") return "bg-accent text-white";
  if (quality === "partial") return "bg-accentSoft text-ink";
  return "bg-muted text-muted-foreground";
}

export function StudentReportView({
  simulationTitle,
  score,
  teamScore,
  completedAt,
  decisions,
  reflectionResponses,
  attemptId,
  sessionId,
}: StudentReportViewProps) {
  const [copilotOpen, setCopilotOpen] = useState(false);

  // Build context for Praxis Copilot
  const decisionsSummary = decisions.map((d, i) =>
    `Decision ${i + 1}: "${d.prompt}"\nYour choice: ${d.selectedLabel ? `${d.selectedLabel}. ${d.selectedTitle}` : "No response"}\nQuality: ${d.qualityLabel}\nExplanation: ${d.explanation}\n`
  ).join("\n");

  const copilotContext = {
    simulationTitle,
    page: "student_report",
    decisions: decisionsSummary,
  };
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="min-h-[44px] -ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Link>
      </Button>

      <FadeIn>
        <section
          className={`rounded-3xl border border-border p-6 sm:p-10 text-center ${APP_TILE_BACKGROUNDS[1]} shadow-[0_12px_30px_rgba(128,52,20,0.08)]`}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/80">
            <Trophy className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">{simulationTitle}</h1>
          {completedAt ? (
            <p className="mt-2 text-sm text-muted-text">
              Completed {new Date(completedAt).toLocaleString()}
            </p>
          ) : null}
          <div className="mt-6 flex items-center justify-center gap-8">
            <div>
              <p className="text-5xl font-bold text-accent">{score}%</p>
              <p className="text-sm text-muted-text mt-1">Your score</p>
            </div>
            {teamScore !== null && (
              <div className="border-l border-border/60 pl-8">
                <p className="text-5xl font-bold text-ink/70">{teamScore}%</p>
                <p className="text-sm text-muted-text mt-1 flex items-center justify-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Team average
                </p>
              </div>
            )}
          </div>
        </section>
      </FadeIn>

      {/* Reflection Responses */}
      {reflectionResponses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-text" />
              <CardTitle>Reflection Responses</CardTitle>
            </div>
            <CardDescription>
              Your answers to the reflection questions after the simulation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reflectionResponses.map((ref, index) => (
              <div key={index} className="rounded-2xl border border-border/80 bg-white/70 p-4 sm:p-5">
                <p className="font-semibold text-ink mb-2">{ref.question}</p>
                <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">{ref.response}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Decision Review</CardTitle>
          <CardDescription>
            See why each choice was strong, partial, or weak based on the scenario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {decisions.map((decision, index) => (
            <div key={decision.decisionId} className="rounded-2xl border border-border/80 bg-white/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-ink">Decision {index + 1}</p>
                <Badge className={qualityBadgeClass(decision.quality)}>
                  {decision.qualityLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-text mb-3">{decision.prompt}</p>
              <p className="text-sm font-medium text-ink mb-1">
                Your choice:{" "}
                {decision.selectedLabel
                  ? `${decision.selectedLabel}. ${decision.selectedTitle}`
                  : "No response recorded"}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Points: {decision.score} / {decision.maxScore}
              </p>
              <Separator className="my-3" />
              <p className="text-sm leading-relaxed text-ink">{decision.explanation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Praxis Copilot for follow-up questions about performance */}
      <CopilotPanel
        open={copilotOpen}
        onToggle={() => setCopilotOpen(!copilotOpen)}
        context={copilotContext}
      />
    </div>
  );
}