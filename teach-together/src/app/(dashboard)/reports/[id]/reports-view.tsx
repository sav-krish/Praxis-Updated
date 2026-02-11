"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Download, 
  Users, 
  BarChart3,
  MessageSquare,
  Trophy
} from "lucide-react";
import type { Simulation, Session, Decision, Option, Participant, Team, Response } from "@/types/database";

interface DecisionWithOptions extends Decision {
  options: Option[];
}

interface ReflectionResponseWithQuestion {
  id: string;
  participant_id: string | null;
  team_id: string | null;
  response: string;
  question: { question: string };
}

interface ReportsViewProps {
  simulation: Simulation;
  sessions: Session[];
  selectedSession: Session;
  decisions: DecisionWithOptions[];
  participants: Participant[];
  teams: Team[];
  responses: Response[];
  reflectionResponses: ReflectionResponseWithQuestion[];
}

export function ReportsView({
  simulation,
  sessions,
  selectedSession,
  decisions,
  participants,
  teams,
  responses,
  reflectionResponses,
}: ReportsViewProps) {
  const router = useRouter();

  // Calculate distribution for each decision
  const getDistribution = (decisionId: string) => {
    const decisionResponses = responses.filter(r => r.decision_id === decisionId);
    const decision = decisions.find(d => d.id === decisionId);
    if (!decision) return [];

    return decision.options.map(option => {
      const count = decisionResponses.filter(r => r.option_id === option.id).length;
      const percentage = decisionResponses.length > 0 
        ? Math.round((count / decisionResponses.length) * 100) 
        : 0;
      return { ...option, count, percentage };
    });
  };

  // Calculate scores per participant/team
  const getScores = () => {
    const scoreMap: Record<string, { name: string; scores: number[]; total: number }> = {};

    if (simulation.mode === "teams") {
      teams.forEach(team => {
        scoreMap[team.id] = { name: team.name, scores: [], total: 0 };
      });
    } else {
      participants.forEach(p => {
        scoreMap[p.id] = { name: p.name, scores: [], total: 0 };
      });
    }

    decisions.forEach(decision => {
      const decisionResponses = responses.filter(r => r.decision_id === decision.id);
      
      decisionResponses.forEach(response => {
        const key = simulation.mode === "teams" ? response.team_id : response.participant_id;
        if (!key || !scoreMap[key]) return;

        const option = decision.options.find(o => o.id === response.option_id);
        const score = option?.score || 0;
        scoreMap[key].scores.push(score);
        scoreMap[key].total += score;
      });
    });

    return Object.values(scoreMap).sort((a, b) => b.total - a.total);
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = [
      simulation.mode === "teams" ? "Team" : "Participant",
      ...decisions.map((_, i) => `Decision ${i + 1}`),
      ...decisions.map((_, i) => `Justification ${i + 1}`),
      "Total Score",
      ...reflectionResponses.length > 0 
        ? [...new Set(reflectionResponses.map(r => r.question.question))]
        : []
    ];

    const rows: string[][] = [];

    if (simulation.mode === "teams") {
      teams.forEach(team => {
        const row: string[] = [team.name];
        
        decisions.forEach(decision => {
          const response = responses.find(r => r.decision_id === decision.id && r.team_id === team.id);
          const option = decision.options.find(o => o.id === response?.option_id);
          row.push(option ? `${option.label}. ${option.title}` : "");
        });

        decisions.forEach(decision => {
          const response = responses.find(r => r.decision_id === decision.id && r.team_id === team.id);
          row.push(response?.justification || "");
        });

        const totalScore = responses
          .filter(r => r.team_id === team.id)
          .reduce((sum, r) => {
            const decision = decisions.find(d => d.id === r.decision_id);
            const option = decision?.options.find(o => o.id === r.option_id);
            return sum + (option?.score || 0);
          }, 0);
        row.push(String(totalScore));

        const teamReflections = reflectionResponses.filter(r => r.team_id === team.id);
        const questions = [...new Set(reflectionResponses.map(r => r.question.question))];
        questions.forEach(q => {
          const reflection = teamReflections.find(r => r.question.question === q);
          row.push(reflection?.response || "");
        });

        rows.push(row);
      });
    } else {
      participants.forEach(participant => {
        const row: string[] = [participant.name];
        
        decisions.forEach(decision => {
          const response = responses.find(r => r.decision_id === decision.id && r.participant_id === participant.id);
          const option = decision.options.find(o => o.id === response?.option_id);
          row.push(option ? `${option.label}. ${option.title}` : "");
        });

        decisions.forEach(decision => {
          const response = responses.find(r => r.decision_id === decision.id && r.participant_id === participant.id);
          row.push(response?.justification || "");
        });

        const totalScore = responses
          .filter(r => r.participant_id === participant.id)
          .reduce((sum, r) => {
            const decision = decisions.find(d => d.id === r.decision_id);
            const option = decision?.options.find(o => o.id === r.option_id);
            return sum + (option?.score || 0);
          }, 0);
        row.push(String(totalScore));

        const pReflections = reflectionResponses.filter(r => r.participant_id === participant.id);
        const questions = [...new Set(reflectionResponses.map(r => r.question.question))];
        questions.forEach(q => {
          const reflection = pReflections.find(r => r.question.question === q);
          row.push(reflection?.response || "");
        });

        rows.push(row);
      });
    }

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${simulation.title.replace(/\s+/g, "_")}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scores = getScores();
  const maxScore = decisions.length * 3;

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{simulation.title}</h1>
            <p className="text-muted-foreground text-sm">Session Results</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {sessions.length > 1 && (
            <Select
              value={selectedSession.id}
              onValueChange={(value) => router.push(`/reports/${simulation.id}?session=${value}`)}
            >
              <SelectTrigger className="w-full min-w-0 sm:w-[200px] min-h-[44px]">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {new Date(s.ended_at!).toLocaleDateString()} - {new Date(s.ended_at!).toLocaleTimeString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={exportCSV} className="min-h-[44px] w-full sm:w-auto flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4 shrink-0" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{participants.length}</span>
              {simulation.mode === "teams" && (
                <span className="text-muted-foreground">({teams.length} teams)</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{responses.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {scores.length > 0 
                  ? (scores.reduce((sum, s) => sum + s.total, 0) / scores.length).toFixed(1)
                  : 0}
              </span>
              <span className="text-muted-foreground">/ {maxScore}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distribution" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto min-h-[44px] p-1">
          <TabsTrigger value="distribution" className="text-xs sm:text-sm py-2">Distribution</TabsTrigger>
          <TabsTrigger value="scores" className="text-xs sm:text-sm py-2">Scores</TabsTrigger>
          <TabsTrigger value="reflections" className="text-xs sm:text-sm py-2">Reflections</TabsTrigger>
        </TabsList>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4 sm:space-y-6">
          {decisions.map((decision, index) => {
            const distribution = getDistribution(decision.id);
            return (
              <Card key={decision.id}>
                <CardHeader className="px-4 sm:px-6">
                  <Badge variant="outline" className="w-fit mb-2">Decision {index + 1}</Badge>
                  <CardTitle className="text-base sm:text-lg break-words">{decision.prompt}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="space-y-4">
                    {distribution.map((option) => (
                      <div key={option.id}>
                        <div className="flex flex-wrap justify-between gap-1 text-sm mb-1">
                          <span className="font-medium break-words">{option.label}. {option.title}</span>
                          <span className="text-muted-foreground shrink-0">{option.count} ({option.percentage}%)</span>
                        </div>
                        <div className="h-8 bg-muted rounded-full overflow-hidden relative">
                          <div 
                            className="h-full bg-primary transition-all flex items-center px-3"
                            style={{ width: `${Math.max(option.percentage, 5)}%` }}
                          >
                            {option.percentage > 20 && (
                              <span className="text-xs font-medium text-primary-foreground">
                                {option.percentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Scores Tab */}
        <TabsContent value="scores">
          <Card>
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
              <CardDescription>
                Scores per {simulation.mode === "teams" ? "team" : "participant"} (max: {maxScore})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scores.map((score, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 text-center">
                      {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 mx-auto" />}
                      {index === 1 && <span className="text-muted-foreground">2</span>}
                      {index === 2 && <span className="text-muted-foreground">3</span>}
                      {index > 2 && <span className="text-muted-foreground">{index + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{score.name}</span>
                        <span className="font-bold">{score.total}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${(score.total / maxScore) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {score.scores.map((s, i) => (
                        <Badge key={i} variant={s === 3 ? "default" : "secondary"} className="w-6 justify-center">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reflections Tab */}
        <TabsContent value="reflections">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Reflection Responses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reflectionResponses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No reflection responses submitted yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {[...new Set(reflectionResponses.map(r => r.question.question))].map(question => (
                    <div key={question}>
                      <h4 className="font-medium mb-3">{question}</h4>
                      <div className="space-y-2">
                        {reflectionResponses
                          .filter(r => r.question.question === question)
                          .map((r, i) => {
                            const name = simulation.mode === "teams"
                              ? teams.find(t => t.id === r.team_id)?.name
                              : participants.find(p => p.id === r.participant_id)?.name;
                            return (
                              <div key={i} className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">{name}</p>
                                <p className="text-sm text-muted-foreground">{r.response}</p>
                              </div>
                            );
                          })}
                      </div>
                      <Separator className="my-4" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
