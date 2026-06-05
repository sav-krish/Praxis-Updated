"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Play, 
  Users, 
  Copy, 
  Check, 
  Download,
  Loader2,
  StopCircle,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Session, Simulation, Participant, Team, SimulationProfile } from "@/types/database";
import { formatScheduleDateTime, getSimulationSessionSchedule } from "@/lib/session-schedule";
import { clearSimulationScheduleForSession } from "@/app/(dashboard)/session/[id]/actions";

type LobbySimulation = Pick<
  Simulation,
  "id" | "title" | "mode" | "hidden_profiles_enabled" | "preferences"
>;

interface SessionLobbyProps {
  session: Session;
  simulation: LobbySimulation;
  participants: Participant[];
  teams: Team[];
  decisions: { id: string }[];
  responses: { decision_id: string; participant_id: string | null; team_id: string | null }[];
  profiles: SimulationProfile[];
}

export function SessionLobby({ 
  session: initialSession, 
  simulation,
  participants: initialParticipants,
  teams: initialTeams,
  decisions,
  responses: initialResponses,
  profiles,
}: SessionLobbyProps) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [participants, setParticipants] = useState(initialParticipants);
  const [teams, setTeams] = useState(initialTeams);
  const [responses, setResponses] = useState(initialResponses);
  const [copied, setCopied] = useState(false);
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [loading, setLoading] = useState(false);
  const transitionRef = useRef(false);
  const scheduleClearedRef = useRef(false);
  const qrWrapperRef = useRef<HTMLDivElement>(null);
  const sessionSchedule = useMemo(
    () => getSimulationSessionSchedule(simulation.preferences),
    [simulation.preferences]
  );
  const scheduledStartLabel = useMemo(
    () => formatScheduleDateTime(sessionSchedule.start_at),
    [sessionSchedule.start_at]
  );
  const scheduledEndLabel = useMemo(
    () => formatScheduleDateTime(sessionSchedule.end_at),
    [sessionSchedule.end_at]
  );
  const hasSavedSchedule = Boolean(sessionSchedule.start_at || sessionSchedule.end_at);

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

  const copyJoinLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopiedJoinLink(true);
    toast.success("Student join link copied!");
    setTimeout(() => setCopiedJoinLink(false), 2000);
  };

  const downloadQrCode = async () => {
    const svg = qrWrapperRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("QR code unavailable");
      return;
    }

    try {
      setDownloadingQr(true);
      const serializer = new XMLSerializer();
      const svgMarkup = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgMarkup], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to render QR code"));
        image.src = svgUrl;
      });

      const width = Number(svg.getAttribute("width")) || 160;
      const height = Number(svg.getAttribute("height")) || 160;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(svgUrl);
        throw new Error("Canvas unavailable");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `praxis-session-${session.join_code}-qr.png`;
      downloadLink.click();
      toast.success("QR code downloaded");
    } catch {
      toast.error("Could not download QR code");
    } finally {
      setDownloadingQr(false);
    }
  };

  const assignProfilesToParticipants = async () => {
    if (!simulation.hidden_profiles_enabled || profiles.length === 0) return;
    const supabase = createClient();
    const unassigned = participants.filter(p => !p.profile_id);
    for (let i = 0; i < unassigned.length; i++) {
      const profile = profiles[i % profiles.length];
      await supabase
        .from("participants")
        .update({ profile_id: profile.id })
        .eq("id", unassigned[i].id);
    }
    // Re-fetch participants so the UI shows updated profile_id
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("session_id", session.id)
      .order("joined_at", { ascending: true });
    if (data) setParticipants(data);
  };

  const reassignProfile = async (participantId: string, profileId: string) => {
    const supabase = createClient();
    await supabase
      .from("participants")
      .update({ profile_id: profileId })
      .eq("id", participantId);
    setParticipants(prev =>
      prev.map(p => p.id === participantId ? { ...p, profile_id: profileId } : p)
    );
  };

  const startSimulation = useCallback(async (opts?: { automatic?: boolean }) => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setLoading(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    // Auto-assign profiles before starting
    await assignProfilesToParticipants();

    const { error } = await supabase
      .from("sessions")
      .update({ 
        status: "running", 
        current_step: 1,
        started_at: now 
      })
      .eq("status", "lobby")
      .eq("id", session.id);

    if (error) {
      if (!opts?.automatic) toast.error("Failed to start simulation");
    } else {
      setSession(prev => ({ ...prev, status: "running", current_step: 1, started_at: now }));
      if (!opts?.automatic) toast.success("Simulation started!");
    }
    setLoading(false);
    transitionRef.current = false;
  }, [assignProfilesToParticipants, session.id]);

  const endSimulation = useCallback(async (opts?: { automatic?: boolean }) => {
    if (transitionRef.current) return;
    transitionRef.current = true;
    setLoading(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("sessions")
      .update({ 
        status: "complete",
        ended_at: now 
      })
      .neq("status", "complete")
      .eq("id", session.id);

    if (error) {
      if (!opts?.automatic) toast.error("Failed to end simulation");
    } else {
      // Optimistic local update
      setSession(prev => ({ ...prev, status: "complete", ended_at: now }));
      if (hasSavedSchedule) {
        scheduleClearedRef.current = true;
        const result = await clearSimulationScheduleForSession(session.id);
        if ("error" in result) {
          scheduleClearedRef.current = false;
        }
      }
      if (!opts?.automatic) {
        toast.success("Simulation ended!");
        router.push(`/reports/${simulation.id}?session=${session.id}`);
      }
    }
    setLoading(false);
    transitionRef.current = false;
  }, [hasSavedSchedule, router, session.id, simulation.id]);

  useEffect(() => {
    if (session.status === "complete") return;

    const syncScheduledStatus = async () => {
      const now = Date.now();
      const endAt = sessionSchedule.end_at ? new Date(sessionSchedule.end_at).getTime() : null;
      const startAt = sessionSchedule.start_at ? new Date(sessionSchedule.start_at).getTime() : null;

      if (endAt && now >= endAt && session.status !== "complete") {
        await endSimulation({ automatic: true });
        return;
      }
      if (startAt && now >= startAt && session.status === "lobby") {
        await startSimulation({ automatic: true });
      }
    };

    void syncScheduledStatus();

    const futureEvents = [sessionSchedule.start_at, sessionSchedule.end_at]
      .map((value) => (value ? new Date(value).getTime() : null))
      .filter((value): value is number => value !== null && value > Date.now());

    if (futureEvents.length === 0) return;

    const timeout = window.setTimeout(() => {
      void syncScheduledStatus();
    }, Math.max(250, Math.min(...futureEvents) - Date.now() + 250));

    return () => window.clearTimeout(timeout);
  }, [endSimulation, session.status, sessionSchedule.end_at, sessionSchedule.start_at, startSimulation]);

  useEffect(() => {
    if (!hasSavedSchedule || scheduleClearedRef.current || session.status !== "complete") return;
    scheduleClearedRef.current = true;
    void clearSimulationScheduleForSession(session.id).then((result) => {
      if ("error" in result) {
        scheduleClearedRef.current = false;
      }
    });
  }, [hasSavedSchedule, session.id, session.status]);

  // Calculate progress
  const getSubmissionCount = (decisionId: string) => {
    if (simulation.mode === "teams") {
      return new Set(responses.filter(r => r.decision_id === decisionId).map(r => r.team_id)).size;
    }
    return new Set(responses.filter(r => r.decision_id === decisionId).map(r => r.participant_id)).size;
  };

  const totalGroups = simulation.mode === "teams" ? teams.length : participants.length;
  const hasFutureScheduledStart =
    session.status === "lobby" &&
    !!sessionSchedule.start_at &&
    new Date(sessionSchedule.start_at).getTime() > Date.now();

  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const getProfileName = (profileId: string | null) =>
    profileId ? profileMap.get(profileId)?.profile_name ?? null : null;

  const hasProfiles = simulation.hidden_profiles_enabled && profiles.length > 0;

  // Group participants by team
  const participantsByTeam = participants.reduce((acc, p) => {
    const teamId = p.team_id || "unassigned";
    if (!acc[teamId]) acc[teamId] = [];
    acc[teamId].push(p);
    return acc;
  }, {} as Record<string, Participant[]>);

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-4">
      {/* Session ended: clear CTA to view report */}
      {session.status === "complete" && (
        <Card className="mb-4 sm:mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-4 sm:px-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Session ended</h2>
              <p className="text-sm text-muted-foreground mt-1">View results and export data for this run.</p>
            </div>
            <Link href={`/reports/${simulation.id}?session=${session.id}`} className="w-full sm:w-auto shrink-0">
              <Button className="w-full min-h-[48px]" size="lg">
                <BarChart3 className="mr-2 h-4 w-4" />
                View report
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold truncate">{simulation.title}</h1>
              <Badge variant={session.status === "lobby" ? "secondary" : session.status === "running" ? "default" : "outline"} className="shrink-0">
                {session.status === "lobby" ? "Lobby" : session.status === "running" ? "Running" : "Complete"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">Session Controls</p>
            {(scheduledStartLabel || scheduledEndLabel) && (
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {scheduledStartLabel ? <p>Starts automatically: {scheduledStartLabel}</p> : null}
                {scheduledEndLabel ? <p>Ends automatically: {scheduledEndLabel}</p> : null}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {session.status === "lobby" && (
            <div className="flex flex-col items-stretch sm:items-end gap-1 flex-1 sm:flex-none min-w-0">
              {participants.length > 0 && (
                <p className="text-sm text-muted-foreground text-center sm:text-right">
                  {participants.length} student{participants.length !== 1 ? "s" : ""} waiting. {hasFutureScheduledStart ? "Session will start automatically." : "Start when ready."}
                </p>
              )}
              <Button onClick={() => void startSimulation()} disabled={loading || participants.length === 0 || hasFutureScheduledStart} className="min-h-[44px] w-full sm:w-auto">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {hasFutureScheduledStart ? "Scheduled Start" : "Start Simulation"}
              </Button>
            </div>
          )}
          {session.status === "running" && (
            <>
              <Link href={`/reports/${simulation.id}?session=${session.id}`} className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full min-h-[44px]">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Results
                </Button>
              </Link>
              <Button variant="destructive" onClick={() => void endSimulation()} disabled={loading} className="min-h-[44px] flex-1 sm:flex-none">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
                End Session
              </Button>
            </>
          )}
          {session.status === "complete" && (
            <Link href={`/reports/${simulation.id}?session=${session.id}`} className="flex-1 sm:flex-none">
              <Button className="w-full min-h-[44px]">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Results
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Join Info */}
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Student Access</CardTitle>
              <CardDescription className="text-sm">Share this student join code, join link, or QR code with your students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-4 sm:px-6">
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Student Join Code</p>
                <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold tracking-wider">
                    {session.join_code}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyJoinCode} className="shrink-0 min-h-[44px] min-w-[44px]">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Student Join Link</p>
                <div className="rounded-md border bg-muted/50 p-3 font-mono text-xs break-all">
                  {joinUrl}
                </div>
                <Button variant="outline" onClick={copyJoinLink} className="min-h-[44px] w-full sm:w-auto">
                  {copiedJoinLink ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copiedJoinLink ? "Copied" : "Copy Student Link"}
                </Button>
              </div>

              <div className="flex justify-center">
                <div ref={qrWrapperRef} className="bg-white p-3 sm:p-4 rounded-lg inline-block">
                  <QRCodeSVG value={joinUrl} size={160} />
                </div>
              </div>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => void downloadQrCode()}
                  disabled={downloadingQr}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  {downloadingQr ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download QR Code
                </Button>
              </div>
            </CardContent>
          </Card>

          {session.status === "running" && (
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Progress</CardTitle>
                <CardDescription className="text-sm">Submission status for each decision</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6">
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
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-5 w-5 shrink-0" />
              Participants
              <Badge variant="secondary">{participants.length}</Badge>
            </CardTitle>
            <CardDescription>
              {simulation.mode === "teams" 
                ? `Team mode - ${teams.length} teams` 
                : "Individual mode"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
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
                    <div className="space-y-1">
                      {participantsByTeam[team.id]?.map(p => (
                        <ParticipantRow
                          key={p.id}
                          participant={p}
                          profileName={getProfileName(p.profile_id)}
                          hasProfiles={hasProfiles}
                          profiles={profiles}
                          onReassign={reassignProfile}
                          showVoter
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {participantsByTeam["unassigned"]?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">Unassigned</h4>
                    <div className="space-y-1">
                      {participantsByTeam["unassigned"].map(p => (
                        <ParticipantRow
                          key={p.id}
                          participant={p}
                          profileName={getProfileName(p.profile_id)}
                          hasProfiles={hasProfiles}
                          profiles={profiles}
                          onReassign={reassignProfile}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {participants.map(p => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    profileName={getProfileName(p.profile_id)}
                    hasProfiles={hasProfiles}
                    profiles={profiles}
                    onReassign={reassignProfile}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ParticipantRow({
  participant,
  profileName,
  hasProfiles,
  profiles,
  onReassign,
  showVoter,
}: {
  participant: Participant;
  profileName: string | null;
  hasProfiles: boolean;
  profiles: SimulationProfile[];
  onReassign: (participantId: string, profileId: string) => void;
  showVoter?: boolean;
}) {
  if (!hasProfiles) {
    return (
      <Badge variant={showVoter && participant.is_voter ? "default" : "secondary"}>
        {participant.name} {showVoter && participant.is_voter && "(Voter)"}
      </Badge>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm truncate">{participant.name}</span>
        {showVoter && participant.is_voter && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0">Voter</Badge>
        )}
        {profileName && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {profileName}
          </Badge>
        )}
      </div>
      <Select
        value={participant.profile_id || "none"}
        onValueChange={(val) => {
          if (val !== "none") onReassign(participant.id, val);
        }}
      >
        <SelectTrigger className="h-7 w-[130px] text-xs shrink-0">
          <SelectValue placeholder="Assign role" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map(p => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              {p.profile_name || `Role ${p.order_num}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
