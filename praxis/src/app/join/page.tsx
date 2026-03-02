"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [joinCode, setJoinCode] = useState(searchParams.get("code") || "");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [session, setSession] = useState<{ id: string; simulation_id: string } | null>(null);

  // Auto-lookup session when code is complete
  useEffect(() => {
    if (joinCode.length === 6) {
      lookupSession();
    }
  }, [joinCode]);

  const lookupSession = async () => {
    setChecking(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("id, simulation_id, status")
      .eq("join_code", joinCode.toUpperCase())
      .single();

    if (data && data.status !== "complete") {
      setSession(data);

      // Check if this tab already joined this session (sessionStorage = per-tab identity)
      const storedId = sessionStorage.getItem(`participant_${data.id}`);
      if (storedId) {
        // Verify the participant still exists in the DB
        const { data: existing } = await supabase
          .from("participants")
          .select("id, name")
          .eq("id", storedId)
          .eq("session_id", data.id)
          .single();

        if (existing) {
          // This tab already joined -- send them straight back to play
          sessionStorage.setItem(`participant_name_${data.id}`, existing.name);
          router.push(`/play/${joinCode.toUpperCase()}`);
          return;
        } else {
          // Stale entry -- clear it so they can re-join fresh
          sessionStorage.removeItem(`participant_${data.id}`);
          sessionStorage.removeItem(`participant_name_${data.id}`);
        }
      }
    } else {
      setSession(null);
    }
    setChecking(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast.error("Invalid join code");
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();

      // Create participant
      const { data: participant, error } = await supabase
        .from("participants")
        .insert({
          session_id: session.id,
          name: name.trim(),
          is_voter: true, // For now, everyone is a voter in individual mode
        })
        .select()
        .single();

      if (error) throw error;

      // Store participant ID in sessionStorage (per-tab, so each tab can be a different student)
      sessionStorage.setItem(`participant_${session.id}`, participant.id);
      sessionStorage.setItem(`participant_name_${session.id}`, name.trim());

      // Navigate to play page
      router.push(`/play/${joinCode.toUpperCase()}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  // Show a spinner while verifying a returning student
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-6">
      <Card className="w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-auto">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-white p-0.5">
            <img src="/logo.jpg" alt="Praxis" className="h-8 w-auto" />
          </span>
            <span className="text-2xl font-bold">Praxis</span>
          </Link>
          <CardTitle>Join Session</CardTitle>
          <CardDescription>
            Enter the code provided by your professor
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Join Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                required
              />
              {joinCode.length === 6 && !session && (
                <p className="text-sm text-destructive">Session not found or already ended</p>
              )}
              {session && (
                <p className="text-sm text-green-600">Session found!</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <Button 
              type="submit" 
              className="w-full min-h-[48px]" 
              disabled={loading || !session || !name.trim()}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Join Session
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}
