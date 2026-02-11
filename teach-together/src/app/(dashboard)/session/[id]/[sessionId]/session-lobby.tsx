"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Play, 
  Users, 
  Copy, 
  Check, 
  Loader2,
  StopCircle,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import type { Session, Simulation, Participant, Team } from "@/types/database";

interface SessionLobbyProps {
  session: Session;
  simulation: Simulation;
  participants: Participant[];
  teams: Team[];
  decisions: { id: string }[];
  responses: { decision_id: string; participant_id: string | null; team_id: string | null }[];
}

export function SessionLobby({ 
  session: initialSession, 
  simulation,
  participants: initialParticipants,
  teams: initialTeams,
  decisions,
  responses: initialResponses
}: SessionLobbyProps) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [participants, setParticipants] = useState(initialParticipants);
  const [teams, setTeams] = useState(initialTeams);
  const [responses, setResponses] = useState(initialResponses);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const joinUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/join?code=${session.join_code}`
    : "";

  // Real-time subscriptions
  useEffect(() => {
    const supabase = createClient();
    const sid = session.id;

    // Subscribe to participants
    const participantsChannel = supabase
      .channel(`lobby-participants-${sid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sid}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setParticipants(prev => [...prev, payload.new as Participant]);
          } else if (payload.eventType === "DELETE") {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            setParticipants(prev => prev.map(p => p.id === payload.new.id ? payload.new as Participant : p));
          }
        }
      )
      .subscribe();

    // Subscribe to teams
    const teamsChannel = supabase
      .channel(`lobby-teams-${sid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `session_id=eq.${sid}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTeams(prev => [...prev, payload.new as Team]);
          }
        }
      )
      .subscribe();

    // Subscribe to responses
    const responsesChannel = supabase
      .channel(`lobby-responses-${sid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses", filter: `session_id=eq.${sid}` },
        (payload) => {
          setResponses(prev => [...prev, payload.new as typeof responses[0]]);
        }
      )
      .subscribe();

    // Subscribe to session updates
    const sessionChannel = supabase
      .channel(`lobby-session-${sid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sid}` },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(responsesChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [session.id]);

  // Polling fallback: refresh participants & responses every 5s in case realtime misses events
  useEffect(() => {
    const supabase = createClient();
    const sid = session.id;

    const interval = setInterval(async () => {
      const [{ data: pData }, { data: rData }] = await Promise.all([
        supabase
          .from("participants")
          .select("*")
          .eq("session_id", sid)
          .order("joined_at", { ascending: true }),
        supabase
          .from("responses")
          .select("decision_id, participant_id, team_id")
          .eq("session_id", sid),
      ]);

      if (pData) setParticipants(pData);
      if (rData) setResponses(rData);
    }, 5000);

    return () => clearInterval(interval);
  }, [session.id]);

  const copyJoinCode = async () => {
    await navigator.clipboard.writeText(session.join_code);
    setCopied(true);
    toast.success("Join code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const startSimulation = async () => {
    setLoading(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("sessions")
      .update({ 
        status: "running", 
        current_step: 1,
        started_at: now 
      })
      .eq("id", session.id);

    if (error) {
      toast.error("Failed to start simulation");
    } else {
      // Optimistic local update so the UI reflects the change immediately
      setSession(prev => ({ ...prev, status: "running", current_step: 1, started_at: now }));
      toast.success("Simulation started!");
    }
    setLoading(false);
  };

  const endSimulation = async () => {
    setLoading(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("sessions")
      .update({ 
        status: "complete",
        ended_at: now 
      })
      .eq("id", session.id);

    if (error) {
      toast.error("Failed to end simulation");
    } else {
      // Optimistic local update
      setSession(prev => ({ ...prev, status: "complete", ended_at: now }));
      toast.success("Simulation ended!");
      router.push(`/reports/${simulation.id}?session=${session.id}`);
    }
    setLoading(false);
  };

  // Calculate progress
  const getSubmissionCount = (decisionId: string) => {
    if (simulation.mode === "teams") {
      return new Set(responses.filter(r => r.decision_id === decisionId).map(r => r.team_id)).size;
    }
    return new Set(responses.filter(r => r.decision_id === decisionId).map(r => r.participant_id)).size;
  };

  const totalGroups = simulation.mode === "teams" ? teams.length : participants.length;

  // Group participants by team
  const participantsByTeam = participants.reduce((acc, p) => {
    const teamId = p.team_id || "unassigned";
    if (!acc[teamId]) acc[teamId] = [];
    acc[teamId].push(p);
    return acc;
  }, {} as Record<string, Participant[]>);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{simulation.title}</h1>
              <Badge variant={session.status === "lobby" ? "secondary" : session.status === "running" ? "default" : "outline"}>
                {session.status === "lobby" ? "Lobby" : session.status === "running" ? "Running" : "Complete"}
              </Badge>
            </div>
            <p className="text-muted-foreground">Session Controls</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === "lobby" && (
            <Button onClick={startSimulation} disabled={loading || participants.length === 0}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Start Simulation
            </Button>
          )}
          {session.status === "running" && (
            <Button variant="destructive" onClick={endSimulation} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
              End Session
            </Button>
          )}
          {session.status === "complete" && (
            <Link href={`/reports/${simulation.id}?session=${session.id}`}>
              <Button>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Results
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Join Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Join Code</CardTitle>
              <CardDescription>Share this code with your students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-5xl font-mono font-bold tracking-wider">
                  {session.join_code}
                </div>
                <Button variant="outline" size="icon" onClick={copyJoinCode}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={joinUrl} size={180} />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Students can scan this QR code or go to <br />
                <span className="font-mono">{joinUrl}</span>
              </p>
            </CardContent>
          </Card>

          {session.status === "running" && (
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>Submission status for each decision</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {decisions.map((decision, index) => {
                  const count = getSubmissionCount(decision.id);
                  const percentage = totalGroups > 0 ? (count / totalGroups) * 100 : 0;
                  return (
                    <div key={decision.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Decision {index + 1}</span>
                        <span>{count} of {totalGroups} submitted</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants
              <Badge variant="secondary">{participants.length}</Badge>
            </CardTitle>
            <CardDescription>
              {simulation.mode === "teams" 
                ? `Team mode - ${teams.length} teams` 
                : "Individual mode"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Waiting for students to join...</p>
                <p className="text-sm">Share the join code above</p>
              </div>
            ) : simulation.mode === "teams" ? (
              <div className="space-y-4">
                {teams.map(team => (
                  <div key={team.id}>
                    <h4 className="font-medium text-sm mb-2">{team.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {participantsByTeam[team.id]?.map(p => (
                        <Badge key={p.id} variant={p.is_voter ? "default" : "secondary"}>
                          {p.name} {p.is_voter && "(Voter)"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {participantsByTeam["unassigned"]?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">Unassigned</h4>
                    <div className="flex flex-wrap gap-2">
                      {participantsByTeam["unassigned"].map(p => (
                        <Badge key={p.id} variant="outline">{p.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {participants.map(p => (
                  <Badge key={p.id} variant="secondary">{p.name}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
