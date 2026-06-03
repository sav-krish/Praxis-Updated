"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldInfoHint } from "@/components/ui/field-info-hint";
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
  Trophy,
  BookOpen,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { FeedbackCard } from "@/components/simulation/FeedbackCard";
import type { Simulation, Session, Decision, Option, Participant, Team, Response } from "@/types/database";
import { ResponseGallery, type ResponseGalleryItem } from "@/components/reports/response-gallery";

// Lazy-load the recharts-heavy metrics panel so the initial /reports route
// bundle stays small. In dev mode, this keeps the route compile fast and lets
// the user navigate away while charts code splits in.
const DeterministicMetrics = dynamic(
  () => import("@/components/reports/deterministic-metrics").then((m) => m.DeterministicMetrics),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
        Loading analytics charts…
      </div>
    ),
  },
);

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

interface DebriefGuide {
  correctCourseOfAction?: string;
  keyDiscussionPoints?: string[];
  commonMistakes?: string[];
  connectionToObjectives?: string;
  facilitatorTips?: string[];
}

type ReportsSimulation = Pick<Simulation, "id" | "title" | "mode" | "justification_type">;
type ReportsSessionListItem = Pick<Session, "id" | "ended_at">;
type ReportsSelectedSession = Pick<Session, "id" | "simulation_id" | "debrief_guide" | "video_gallery_share_id">;
type ReportsParticipant = Pick<Participant, "id" | "session_id" | "team_id" | "name">;
type ReportsTeam = Pick<Team, "id" | "session_id" | "name">;
type ReportsResponse = Pick<
  Response,
  | "id"
  | "session_id"
  | "participant_id"
  | "team_id"
  | "decision_id"
  | "option_id"
  | "justification"
  | "submitted_at"
>;

interface ReportsViewProps {
  simulation: ReportsSimulation;
  sessions: ReportsSessionListItem[];
  selectedSession: ReportsSelectedSession;
  decisions: DecisionWithOptions[];
  participants: ReportsParticipant[];
  teams: ReportsTeam[];
  responses: ReportsResponse[];
  responseGalleryItems: ResponseGalleryItem[];
  reflectionResponses: ReflectionResponseWithQuestion[];
  initialDebrief?: Record<string, unknown> | null;
}

export function ReportsView({
  simulation,
  sessions,
  selectedSession,
  decisions,
  participants,
  teams,
  responses,
  responseGalleryItems,
  reflectionResponses,
  initialDebrief,
}: ReportsViewProps) {
  const router = useRouter();
  const galleryUrl = `/response-gallery/${selectedSession.video_gallery_share_id}`;
  const [debrief, setDebrief] = useState<DebriefGuide | null>(initialDebrief as DebriefGuide | null);
  const [generatingDebrief, setGeneratingDebrief] = useState(false);
  const [streamingField, setStreamingField] = useState<string | null>(null);

  const generateDebrief = async () => {
    setGeneratingDebrief(true);
    setDebrief(null);
    setStreamingField(null);
    try {
      const res = await fetch("/api/generate-debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession.id }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        toast.error(err || "Failed to generate guide");
        setGeneratingDebrief(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const partial: DebriefGuide = {};

      const handleEvent = (event: string, data: unknown) => {
        if (event === "cached" || event === "done") {
          const next = (data as { debrief?: DebriefGuide }).debrief;
          if (next) {
            setDebrief(next);
            setStreamingField(null);
            if (event === "done") toast.success("Facilitator guide ready");
          }
          return;
        }
        if (event === "field") {
          setStreamingField((data as { name: string }).name);
          return;
        }
        if (event === "delta") {
          const { name, t } = data as { name: keyof DebriefGuide; t: string };
          if (name === "correctCourseOfAction" || name === "connectionToObjectives") {
            partial[name] = ((partial[name] as string | undefined) ?? "") + t;
            setDebrief({ ...partial });
          }
          return;
        }
        if (event === "field-done") {
          const { name, value } = data as { name: keyof DebriefGuide; value: unknown };
          // Type-narrow per field shape.
          if (name === "correctCourseOfAction" || name === "connectionToObjectives") {
            partial[name] = String(value ?? "");
          } else if (name === "keyDiscussionPoints" || name === "commonMistakes" || name === "facilitatorTips") {
            partial[name] = Array.isArray(value) ? (value as string[]) : [];
          }
          setDebrief({ ...partial });
          return;
        }
        if (event === "error") {
          toast.error((data as { message?: string }).message || "Failed to generate guide");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let blank = buffer.indexOf("\n\n");
        while (blank !== -1) {
          const raw = buffer.slice(0, blank);
          buffer = buffer.slice(blank + 2);
          const lines = raw.split("\n");
          let event = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (dataStr) {
            try {
              handleEvent(event, JSON.parse(dataStr));
            } catch {
              /* ignore malformed packet */
            }
          }
          blank = buffer.indexOf("\n\n");
        }
      }
    } catch {
      toast.error("Failed to generate facilitator guide");
    } finally {
      setGeneratingDebrief(false);
      setStreamingField(null);
    }
  };

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

      <DeterministicMetrics
        decisions={decisions}
        responses={responses}
        participants={participants}
        teams={teams}
        reflectionResponses={reflectionResponses}
        mode={simulation.mode}
      />

      <div className="h-4 sm:h-6" />

      <Tabs defaultValue="distribution" className="space-y-4 sm:space-y-6">
        <TabsList className="grid h-auto min-h-[44px] w-full grid-cols-5 p-1">
          <TabsTrigger value="distribution" className="text-xs sm:text-sm py-2">Distribution</TabsTrigger>
          <TabsTrigger value="scores" className="text-xs sm:text-sm py-2">Scores</TabsTrigger>
          <TabsTrigger value="reflections" className="text-xs sm:text-sm py-2">Reflections</TabsTrigger>
          <TabsTrigger value="response-gallery" className="text-xs sm:text-sm py-2">Response Gallery</TabsTrigger>
          <TabsTrigger value="debrief" className="text-xs sm:text-sm py-2">Debrief</TabsTrigger>
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

        <TabsContent value="response-gallery" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Response Gallery</h3>
              <p className="text-sm text-muted-foreground">
                Organized by decision and selected option. Share the gallery after class to compare reasoning.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const fullUrl = `${window.location.origin}${galleryUrl}`;
                await navigator.clipboard.writeText(fullUrl);
                toast.success("Gallery link copied");
              }}
            >
              Copy Gallery Link
            </Button>
          </div>
          <ResponseGallery decisions={decisions} items={responseGalleryItems} />
        </TabsContent>

        {/* Scores Tab */}
        <TabsContent value="scores">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="flex-1">Score Breakdown</CardTitle>
                <FieldInfoHint className="shrink-0">
                  Scores per {simulation.mode === "teams" ? "team" : "participant"} (max: {maxScore})
                </FieldInfoHint>
              </div>
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

        {/* Debrief Tab */}
        <TabsContent value="debrief" className="space-y-4 sm:space-y-6">
          {!debrief && !generatingDebrief ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground" />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <h3 className="font-semibold text-lg">Facilitator Guide</h3>
                    <FieldInfoHint side="bottom" align="start">
                      Generate an AI-powered debrief guide with discussion points, correct course of action,
                      common mistakes, and facilitation tips.
                    </FieldInfoHint>
                  </div>
                </div>
                <Button onClick={generateDebrief} disabled={generatingDebrief} className="min-h-[44px]">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Facilitator Guide
                </Button>
              </CardContent>
            </Card>
          ) : !debrief ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  {streamingField
                    ? `Drafting ${streamingField.replace(/([A-Z])/g, " $1").toLowerCase()}…`
                    : "Warming up the model…"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Correct Course of Action
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{debrief.correctCourseOfAction}</p>
                </CardContent>
              </Card>

              {debrief.keyDiscussionPoints && debrief.keyDiscussionPoints.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex-1">Key Discussion Points</CardTitle>
                      <FieldInfoHint className="shrink-0">
                        Topics and questions to raise during the debrief
                      </FieldInfoHint>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {debrief.keyDiscussionPoints.map((point, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {debrief.commonMistakes && debrief.commonMistakes.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="flex-1">Common Student Mistakes</CardTitle>
                      <FieldInfoHint className="shrink-0">
                        Patterns to watch for and how to address them
                      </FieldInfoHint>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {debrief.commonMistakes.map((mistake, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-destructive font-medium shrink-0">!</span>
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {debrief.connectionToObjectives && (
                <Card>
                  <CardHeader>
                    <CardTitle>Connection to Learning Objectives</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{debrief.connectionToObjectives}</p>
                  </CardContent>
                </Card>
              )}

              {debrief.facilitatorTips && debrief.facilitatorTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Facilitator Tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {debrief.facilitatorTips.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-primary shrink-0">-</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Separator />

          <FeedbackCard
            simulationId={simulation.id}
            sessionId={selectedSession.id}
            feedbackType="post_session"
            role="professor"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
