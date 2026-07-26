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
  if (quality === "strong") return "bg-primary text-primary-foreground";
  if (quality === "partial") return "bg-secondary text-secondary-foreground";
  return "bg-muted text-foreground";
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
  void attemptId;
  void sessionId;
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
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <Button variant="ghost" asChild className="min-h-[44px] -ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Link>
      </Button>

      <FadeIn>
        <section
          className={`min-w-0 rounded-3xl border border-border p-5 text-center sm:p-10 ${APP_TILE_BACKGROUNDS[1]} shadow-[0_12px_30px_rgba(128,52,20,0.08)]`}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/80">
            <Trophy className="h-7 w-7 text-accent" />
          </div>
          <h1 className="break-words text-2xl font-bold text-foreground sm:text-3xl">
            {simulationTitle}
          </h1>
          {completedAt ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Completed {new Date(completedAt).toLocaleString()}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
            <div>
              <p className="text-4xl font-bold text-[#b44308] dark:text-[#ff9a5c] sm:text-5xl">
                {score}%
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Your score</p>
            </div>
            {teamScore !== null && (
              <div className="border-t border-border/60 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                <p className="text-4xl font-bold text-foreground sm:text-5xl">{teamScore}%</p>
                <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
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
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Reflection Responses</CardTitle>
            </div>
            <CardDescription>
              Your answers to the reflection questions after the simulation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reflectionResponses.map((ref, index) => (
              <div key={index} className="min-w-0 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5">
                <p className="mb-2 break-words font-semibold">{ref.question}</p>
                <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{ref.response}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}


      {/* Praxis Copilot for follow-up questions about performance */}
      <CopilotPanel
        open={copilotOpen}
        onToggle={() => setCopilotOpen(!copilotOpen)}
        context={copilotContext}
      />
    </div>
  );
}
