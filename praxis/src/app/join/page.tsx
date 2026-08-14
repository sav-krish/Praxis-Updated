"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  ArrowRight,
  UserPlus,
  SkipForward,
  CheckCircle2,
  CircleAlert,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { PraxisLogo } from "@/components/praxis-logo";

const JOIN_CODE_LENGTH = 6;

function normalizeJoinCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, JOIN_CODE_LENGTH);
}

function joinCodeSlots(value: string) {
  const characters = normalizeJoinCode(value).split("");
  return Array.from({ length: JOIN_CODE_LENGTH }, (_, index) => characters[index] ?? "");
}

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [joinCodeSlotsState, setJoinCodeSlotsState] = useState(() =>
    joinCodeSlots(searchParams.get("code") || ""),
  );
  const joinCode = joinCodeSlotsState.join("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);
  const [session, setSession] = useState<{ id: string; simulation_id: string } | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [pendingJoinData, setPendingJoinData] = useState<{ participantId: string; participantName: string; sessionId: string } | null>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const lookupRequestRef = useRef(0);

  const updateJoinCodeSlots = useCallback((nextSlots: string[]) => {
    lookupRequestRef.current += 1;
    setJoinCodeSlotsState(nextSlots);
    setSession(null);
    setInvalidCode(false);
  }, []);

  const focusCodeInput = (index: number) => {
    window.requestAnimationFrame(() => codeInputRefs.current[index]?.focus());
  };

  const lookupSession = useCallback(async (codeToCheck: string) => {
    const requestId = ++lookupRequestRef.current;
    setChecking(true);
    setInvalidCode(false);
    setSession(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("id, simulation_id, status")
      .eq("join_code", codeToCheck)
      .single();

    if (requestId !== lookupRequestRef.current) return;

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

        if (requestId !== lookupRequestRef.current) return;

        if (existing) {
          // This tab already joined -- send them straight back to play
          sessionStorage.setItem(`participant_name_${data.id}`, existing.name);
          setChecking(false);
          router.push(`/play/${codeToCheck}`);
          return;
        } else {
          // Stale entry -- clear it so they can re-join fresh
          sessionStorage.removeItem(`participant_${data.id}`);
          sessionStorage.removeItem(`participant_name_${data.id}`);
        }
      }
    } else {
      setSession(null);
      setInvalidCode(true);
    }
    setChecking(false);
  }, [router]);

  // Auto-lookup session when code is complete
  useEffect(() => {
    if (joinCodeSlotsState.every(Boolean)) {
      void lookupSession(joinCode);
      return;
    }
    setChecking(false);
    setSession(null);
    setInvalidCode(false);
  }, [joinCode, joinCodeSlotsState, lookupSession]);

  const handleCodeChange = (index: number, value: string) => {
    const insertedCode = normalizeJoinCode(value);
    if (!insertedCode) {
      if (!value) {
        const nextSlots = [...joinCodeSlotsState];
        nextSlots[index] = "";
        updateJoinCodeSlots(nextSlots);
      }
      return;
    }

    const nextSlots = [...joinCodeSlotsState];
    insertedCode.split("").forEach((character, offset) => {
      if (index + offset < JOIN_CODE_LENGTH) nextSlots[index + offset] = character;
    });
    updateJoinCodeSlots(nextSlots);
    focusCodeInput(Math.min(index + insertedCode.length, JOIN_CODE_LENGTH - 1));
  };

  const handleCodeKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const removeIndex = joinCodeSlotsState[index] ? index : index - 1;
      if (removeIndex < 0) return;
      const nextSlots = [...joinCodeSlotsState];
      nextSlots[removeIndex] = "";
      updateJoinCodeSlots(nextSlots);
      focusCodeInput(Math.max(0, removeIndex));
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCodeInput(Math.max(0, index - 1));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCodeInput(Math.min(JOIN_CODE_LENGTH - 1, index + 1));
    }
  };

  const handleCodePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedCode = normalizeJoinCode(event.clipboardData.getData("text"));
    if (!pastedCode) return;
    const nextSlots = [...joinCodeSlotsState];
    pastedCode.split("").forEach((character, offset) => {
      if (index + offset < JOIN_CODE_LENGTH) nextSlots[index + offset] = character;
    });
    updateJoinCodeSlots(nextSlots);
    focusCodeInput(Math.min(index + pastedCode.length, JOIN_CODE_LENGTH - 1));
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast.error("Invalid join code");
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`/api/join/session/${joinCode.toUpperCase()}/participant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const result = (await response.json().catch(() => null)) as
        | { participantId: string; participantName: string; sessionId: string }
        | { error?: string }
        | null;

      if (!response.ok || !result || !("participantId" in result)) {
        throw new Error(result && "error" in result ? result.error : "Failed to join session");
      }

      // Store the pending join data and show the account creation modal
      setPendingJoinData(result);
      setShowAccountModal(true);
    } catch (error) {
      logger.error(error);
      toast.error("Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    // Store participant data temporarily for after signup redirect
    if (pendingJoinData) {
      sessionStorage.setItem(`participant_${session!.id}`, pendingJoinData.participantId);
      sessionStorage.setItem(`participant_name_${session!.id}`, pendingJoinData.participantName);
      // Redirect to signup with the join code so they can create an account
      // After signup, they'll be redirected back to the play page
      router.push(`/auth/signup?role=student&code=${joinCode.toUpperCase()}`);
    }
  };

  const handleContinueWithoutAccount = () => {
    // Store participant data for anonymous session
    if (pendingJoinData) {
      sessionStorage.setItem(`participant_${session!.id}`, pendingJoinData.participantId);
      sessionStorage.setItem(`participant_name_${session!.id}`, pendingJoinData.participantName);
      localStorage.setItem("praxis_active_session_code", joinCode.toUpperCase());
      localStorage.setItem("praxis_guest_participant_id", pendingJoinData.participantId);
    }
    setShowAccountModal(false);
    setPendingJoinData(null);
    // Navigate to play page
    router.push(
      `/play/${joinCode.toUpperCase()}?participantId=${encodeURIComponent(pendingJoinData?.participantId ?? "")}&participantName=${encodeURIComponent(pendingJoinData?.participantName ?? "")}`,
    );
  };

  return (
    <div className="praxis-student-ui relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#fffaf6] px-4 py-8 text-[#111827] dark:bg-[#08121e] dark:text-[#f9fafb]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_28%,rgba(249,115,22,0.10),transparent_20rem),radial-gradient(circle_at_92%_76%,rgba(251,146,60,0.10),transparent_24rem)] dark:bg-[radial-gradient(circle_at_8%_28%,rgba(251,146,60,0.08),transparent_20rem),radial-gradient(circle_at_92%_76%,rgba(96,165,250,0.05),transparent_24rem)]" />
      <div className="fixed right-4 top-4 z-20 rounded-full border border-[#fed7aa] bg-white/90 shadow-sm backdrop-blur dark:border-[#334155] dark:bg-[#111827]/90">
        <ThemeToggle />
      </div>
      <Card className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border-[#fee2d2] bg-white/95 py-0 shadow-[0_22px_55px_rgba(154,52,18,0.12)] dark:border-[#1f2937] dark:bg-[#111827]/95 dark:shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
        <CardHeader className="px-6 pb-3 pt-8 text-center sm:px-8 sm:pt-9">
          <Link href="/" className="mb-5 flex items-center justify-center">
            <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-white px-1 py-0.5 dark:bg-transparent">
              <PraxisLogo className="h-8 w-auto sm:h-9" priority />
            </span>
          </Link>
          <CardTitle className="praxis-join-heading text-[28px] font-semibold leading-9 tracking-[-0.03em] text-[#111827] sm:text-[32px] sm:leading-10 dark:text-[#f9fafb]">
            Join Session
          </CardTitle>
          <CardDescription className="mt-1 text-sm leading-5 text-[#6b7280] dark:text-[#9ca3af]">
            Enter the code provided by your professor.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoin}>
          <CardContent className="space-y-5 px-6 pb-8 pt-3 sm:px-8">
            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-[#374151] dark:text-[#d1d5db]">Join code</Label>
              <div className="grid grid-cols-6 gap-2" role="group" aria-label="Six character join code">
                {Array.from({ length: JOIN_CODE_LENGTH }, (_, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      codeInputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="text"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    aria-label={`Join code character ${index + 1} of ${JOIN_CODE_LENGTH}`}
                    aria-invalid={invalidCode || undefined}
                    value={joinCodeSlotsState[index]}
                    onChange={(event) => handleCodeChange(index, event.target.value)}
                    onKeyDown={(event) => handleCodeKeyDown(index, event)}
                    onPaste={(event) => handleCodePaste(index, event)}
                    onFocus={(event) => event.currentTarget.select()}
                    className={`h-11 min-w-0 rounded-lg border bg-white text-center text-base font-semibold uppercase text-[#111827] outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#fed7aa] dark:bg-[#111827] dark:text-[#f9fafb] dark:focus:ring-[#7c2d12] sm:h-12 sm:text-lg ${
                      invalidCode
                        ? "border-[#dc2626]"
                        : "border-[#fed7aa] dark:border-[#374151]"
                    }`}
                    maxLength={JOIN_CODE_LENGTH}
                  />
                ))}
              </div>
              <div className="min-h-6" aria-live="polite">
                {checking ? (
                  <p className="flex items-center gap-2 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f97316]" />
                    Checking session…
                  </p>
                ) : session ? (
                  <p className="flex items-center gap-2 rounded-lg bg-[#ecfdf5] px-3 py-2 text-xs font-medium text-[#166534] dark:bg-[#065f46]/30 dark:text-[#86efac]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                    Session found!
                  </p>
                ) : invalidCode ? (
                  <p className="flex items-center gap-2 text-xs font-medium text-[#dc2626] dark:text-[#fca5a5]">
                    <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                    Invalid session code. Please check and try again.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-[#374151] dark:text-[#d1d5db]">Display name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                maxLength={30}
                required
                className="h-11 rounded-lg border-[#fed7aa] bg-white text-sm text-[#111827] placeholder:text-[#9ca3af] focus-visible:border-[#f97316] focus-visible:ring-[#fed7aa] dark:border-[#374151] dark:bg-[#111827] dark:text-[#f9fafb] sm:h-12"
              />
              <p className="flex items-center gap-1.5 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                <Info className="h-3.5 w-3.5" aria-hidden />
                Your instructor can see your identity.
              </p>
            </div>
            <Button
              type="submit"
              className="min-h-12 w-full rounded-lg bg-[#f97316] text-sm font-medium text-white shadow-sm hover:bg-[#ea580c] hover:text-white disabled:bg-[#fed7aa] disabled:text-white dark:bg-[#fb923c] dark:hover:bg-[#f97316]"
              disabled={loading || checking || !session || !name.trim()}
            >
              {loading ? (
                <>
                  Joining
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <>
                  Join Session
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            <div className="pt-1 text-center text-xs text-[#6b7280] dark:text-[#9ca3af]">
              <p>
                Already have an account?{" "}
                <Link href="/auth/login" className="font-medium text-[#ea580c] hover:underline dark:text-[#fb923c]">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </form>
      </Card>

      {/* Account Creation Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Save Your Progress?</CardTitle>
              <CardDescription>
                Create an account to view your reports and track your performance over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Button
                onClick={handleCreateAccount}
                className="w-full"
                size="lg"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account & Join
              </Button>
              <Button
                onClick={handleContinueWithoutAccount}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Continue Without Account
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
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
