"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  BookOpen, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  Clock,
  Trophy,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DataBlockRenderer } from "@/components/simulation/DataBlockRenderer";
import { FeedbackCard } from "@/components/simulation/FeedbackCard";

interface Option {
  id: string;
  label: string;
  title: string;
  description: string | null;
  consequence: string | null;
  score: number;
}

interface Decision {
  id: string;
  order_num: number;
  prompt: string;
  options: Option[];
}

interface Session {
  id: string;
  status: string;
  current_step: number;
  simulation: {
    id: string;
    title: string;
    background_content: string | null;
    mode: string;
    estimated_minutes?: number | null;
    hidden_profiles_enabled?: boolean;
  };
}

interface PlayerProfile {
  profile_name: string;
  private_briefing: string;
}

interface ReflectionQuestion {
  id: string;
  order_num: number;
  question: string;
}

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [reflectionQuestions, setReflectionQuestions] = useState<ReflectionQuestion[]>([]);
  const [dataBlocks, setDataBlocks] = useState<Array<{ id: string; block_type: string; title: string | null; data: unknown }>>([]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState<string>("");
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  
  // Current state
  const [currentStep, setCurrentStep] = useState(0); // 0 = waiting, 1 = background, 2-4 = decisions, 5 = reflection, 6 = results
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [showConsequence, setShowConsequence] = useState(false);
  const [currentConsequence, setCurrentConsequence] = useState("");
  const [myResponses, setMyResponses] = useState<{ decision_id: string; option_id: string; score: number }[]>([]);
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [returnToStep, setReturnToStep] = useState<number | null>(null);
  const [returnToConsequence, setReturnToConsequence] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  // Ref to always have latest currentStep in callbacks without re-subscribing
  const currentStepRef = useRef(currentStep);

  // Ref to hold session id for polling without re-subscribing
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Subscribe to participant count while waiting (for "N students joined" message)
  useEffect(() => {
    if (!session || currentStep !== 0) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`play-participants-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${session.id}` },
        () => {
          supabase
            .from("participants")
            .select("*", { count: "exact", head: true })
            .eq("session_id", session.id)
            .then(({ count }) => setParticipantCount(count ?? 0));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, currentStep]);

  // Subscribe to session updates via Supabase Realtime
  useEffect(() => {
    if (!session) return;
    sessionIdRef.current = session.id;

    const supabase = createClient();
    const channel = supabase
      .channel(`session-play-${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          const updated = payload.new as { status: string; current_step: number };
          if (updated.status === "running" && currentStepRef.current === 0) {
            setCurrentStep(1); // Move to background
          }
          if (updated.status === "complete") {
            setCurrentStep(6); // Move to results
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]); // Only re-subscribe when session id changes, not on every step

  // Fetch hidden profile when transitioning to background step
  useEffect(() => {
    if (currentStep !== 1 || playerProfile || !participantId || !session?.simulation?.hidden_profiles_enabled) return;
    const supabase = createClient();
    (async () => {
      const { data: pData } = await supabase
        .from("participants")
        .select("profile_id")
        .eq("id", participantId)
        .single();
      if (pData?.profile_id) {
        const { data: prof } = await supabase
          .from("simulation_profiles")
          .select("profile_name, private_briefing")
          .eq("id", pData.profile_id)
          .single();
        if (prof) setPlayerProfile(prof);
      }
    })();
  }, [currentStep, participantId, playerProfile, session?.simulation?.hidden_profiles_enabled]);

  // Polling fallback: check session status every 2s (lobby) or 5s (active)
  useEffect(() => {
    if (!session) return;

    const supabase = createClient();
    const pollInterval = currentStep === 0 ? 2000 : 5000;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("sessions")
        .select("status")
        .eq("id", session.id)
        .single();

      if (data?.status === "running" && currentStepRef.current === 0) {
        setCurrentStep(1);
      }
      if (data?.status === "complete" && currentStepRef.current !== 6) {
        setCurrentStep(6);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [session?.id, currentStep]);

  async function loadSession() {
    const supabase = createClient();

    // Get session
    const { data: sessionData, error } = await supabase
      .from("sessions")
      .select(`
        id,
        status,
        current_step,
        simulation:simulations(id, title, background_content, mode, estimated_minutes, hidden_profiles_enabled)
      `)
      .eq("join_code", code.toUpperCase())
      .single();

    if (error || !sessionData) {
      toast.error("Session not found");
      router.push("/join");
      return;
    }

    // Extract simulation from the nested result (can be null if RLS blocks anon from reading simulation)
    const simulationData = sessionData.simulation as unknown as {
      id: string;
      title: string;
      background_content: string | null;
      mode: string;
      estimated_minutes?: number | null;
      hidden_profiles_enabled?: boolean;
    } | null;

    if (!simulationData?.id) {
      toast.error("Simulation data unavailable");
      router.push("/join");
      return;
    }

    const sessionWithSimulation: Session = {
      id: sessionData.id,
      status: sessionData.status,
      current_step: sessionData.current_step,
      simulation: simulationData
    };

    setSession(sessionWithSimulation);

    // Participant count for waiting screen
    const { count } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionData.id);
    setParticipantCount(count ?? 0);

    // Get participant ID from sessionStorage (per-tab identity)
    const storedParticipantId = sessionStorage.getItem(`participant_${sessionData.id}`);
    const storedName = sessionStorage.getItem(`participant_name_${sessionData.id}`);
    
    if (!storedParticipantId) {
      router.push(`/join?code=${code}`);
      return;
    }

    // Verify the participant still exists in the DB (handles deleted / stale entries)
    const { data: existingParticipant } = await supabase
      .from("participants")
      .select("id, name, profile_id")
      .eq("id", storedParticipantId)
      .eq("session_id", sessionData.id)
      .single();

    if (!existingParticipant) {
      sessionStorage.removeItem(`participant_${sessionData.id}`);
      sessionStorage.removeItem(`participant_name_${sessionData.id}`);
      router.push(`/join?code=${code}`);
      return;
    }

    setParticipantId(storedParticipantId);
    setParticipantName(existingParticipant.name || storedName || "");

    // Fetch assigned hidden profile (if any)
    if (existingParticipant.profile_id) {
      const { data: profileData } = await supabase
        .from("simulation_profiles")
        .select("profile_name, private_briefing")
        .eq("id", existingParticipant.profile_id)
        .single();
      if (profileData) setPlayerProfile(profileData);
    }

    // Load decisions
    const { data: decisionsData } = await supabase
      .from("decisions")
      .select(`
        id,
        order_num,
        prompt,
        options(id, label, title, description, consequence, score)
      `)
      .eq("simulation_id", simulationData.id)
      .order("order_num", { ascending: true });

    // #region agent log
    if (decisionsData) {
      setDecisions(decisionsData.map((d: { id: string; order_num: number; prompt: string; options: Option[] }) => ({
        ...d,
        options: d.options.sort((a: Option, b: Option) => a.label.localeCompare(b.label))
      })));
    }
    fetch('http://127.0.0.1:7442/ingest/e3c66b5a-7991-4a9b-8675-349b01d5f1fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f8666f'},body:JSON.stringify({sessionId:'f8666f',location:'play/page.tsx:loadSession',message:'loadSession decisionsData',data:{decisionsCount:decisionsData?.length??0,hasDecisions:!!decisionsData},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Load reflection questions
    const { data: questionsData } = await supabase
      .from("reflection_questions")
      .select("*")
      .eq("simulation_id", simulationData.id)
      .order("order_num", { ascending: true });

    if (questionsData) {
      setReflectionQuestions(questionsData);
    }

    // Load data blocks
    const { data: blocksData } = await supabase
      .from("simulation_data_blocks")
      .select("id, block_type, title, data")
      .eq("simulation_id", simulationData.id)
      .order("order_num", { ascending: true });

    if (blocksData) {
      setDataBlocks(blocksData);
    }

    // Load existing responses
    const { data: responsesData } = await supabase
      .from("responses")
      .select("decision_id, option_id")
      .eq("session_id", sessionData.id)
      .eq("participant_id", storedParticipantId);

    // #region agent log
    const answeredCount = responsesData?.length || 0;
    fetch('http://127.0.0.1:7442/ingest/e3c66b5a-7991-4a9b-8675-349b01d5f1fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f8666f'},body:JSON.stringify({sessionId:'f8666f',location:'play/page.tsx:loadSession',message:'loadSession responses',data:{storedParticipantId:storedParticipantId?.slice(0,8),participantName:existingParticipant?.name,responsesCount:responsesData?.length??0,answeredCount,sessionStatus:sessionData.status},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (responsesData && responsesData.length > 0) {
      const responseMap = responsesData.map(r => {
        const decision = decisionsData?.find(d => d.id === r.decision_id);
        const option = decision?.options.find((o: Option) => o.id === r.option_id);
        return { decision_id: r.decision_id, option_id: r.option_id, score: option?.score || 0 };
      });
      setMyResponses(responseMap);
    }

    // Set initial step based on session status
    let stepToSet = 0;
    if (sessionData.status === "lobby") {
      stepToSet = 0;
    } else if (sessionData.status === "running") {
      // Calculate where the student should be
      if (answeredCount === 0) {
        stepToSet = 1; // Background
      } else if (answeredCount < 3) {
        stepToSet = answeredCount + 2; // Next decision
      } else {
        stepToSet = 5; // Reflection
      }
    } else {
      stepToSet = 6; // Complete
    }
    // #region agent log
    fetch('http://127.0.0.1:7442/ingest/e3c66b5a-7991-4a9b-8675-349b01d5f1fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f8666f'},body:JSON.stringify({sessionId:'f8666f',location:'play/page.tsx:loadSession',message:'loadSession setInitialStep',data:{stepToSet,answeredCount,sessionStatus:sessionData.status},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    setCurrentStep(stepToSet);

    setLoading(false);
  }

  // Load session data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
  }, [code]);

  const submitDecision = async () => {
    if (!selectedOption || !session || !participantId) return;
    setSubmitting(true);

    const supabase = createClient();
    const decisionIndex = currentStep - 2;
    const decision = decisions[decisionIndex];
    const option = decision.options.find(o => o.id === selectedOption);

    // Save response
    const { error } = await supabase
      .from("responses")
      .insert({
        session_id: session.id,
        participant_id: participantId,
        decision_id: decision.id,
        option_id: selectedOption,
        justification: justification,
      });

    if (error) {
      toast.error("Failed to submit response");
      setSubmitting(false);
      return;
    }

    // Add to my responses
    setMyResponses(prev => [...prev, { 
      decision_id: decision.id, 
      option_id: selectedOption, 
      score: option?.score || 0 
    }]);

    // Show consequence
    setCurrentConsequence(option?.consequence || "");
    setShowConsequence(true);
    setSubmitting(false);
  };

  const continueToNext = () => {
    setShowConsequence(false);
    setSelectedOption(null);
    setJustification("");
    setCurrentConsequence("");
    setCurrentStep(prev => prev + 1);
  };

  const submitReflection = async () => {
    if (!session || !participantId) return;
    setSubmitting(true);

    const supabase = createClient();

    for (const question of reflectionQuestions) {
      const answer = reflectionAnswers[question.id];
      if (answer) {
        await supabase
          .from("reflection_responses")
          .insert({
            session_id: session.id,
            participant_id: participantId,
            question_id: question.id,
            response: answer,
          });
      }
    }

    setCurrentStep(6);
    setSubmitting(false);
  };

  const manualRefreshSession = async () => {
    if (!session) return;
    setManualRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("status")
      .eq("id", session.id)
      .single();

    if (data?.status === "running" && currentStep === 0) {
      setCurrentStep(1);
    } else if (data?.status === "complete") {
      setCurrentStep(6);
    }
    setManualRefreshing(false);
  };

  const totalScore = myResponses.reduce((sum, r) => sum + r.score, 0);
  const maxScore = decisions.length * 3;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Waiting screen
  if (currentStep === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="h-8 w-8 text-primary shrink-0" />
            </div>
            <CardTitle className="text-lg sm:text-xl line-clamp-2">{session?.simulation.title}</CardTitle>
            <CardDescription>Welcome, {participantName}!</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3 text-center">
              <p className="font-medium text-foreground">You&apos;re in.</p>
              <p className="text-muted-foreground text-sm sm:text-base">
                {participantCount <= 1
                  ? "Waiting for the instructor to start."
                  : `${participantCount} students joined. Waiting for the instructor to start.`}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2 text-muted-foreground">
                <Clock className="h-4 w-4 animate-pulse shrink-0" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={manualRefreshSession}
                disabled={manualRefreshing}
                className="mt-3 text-muted-foreground"
              >
                <RefreshCw className={`mr-2 h-3.5 w-3.5 ${manualRefreshing ? "animate-spin" : ""}`} />
                {manualRefreshing ? "Checking..." : "Refresh status"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Background screen
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-muted/50 py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <Badge className="w-fit mb-2">Background</Badge>
              <CardTitle className="text-lg sm:text-xl line-clamp-2">{session?.simulation.title}</CardTitle>
              <CardDescription className="text-sm">
                Read the scenario carefully before making decisions.
                {session?.simulation.estimated_minutes ? (
                  <span className="block mt-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 inline mr-1" />
                    Est. ~{session.simulation.estimated_minutes} min
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {playerProfile && (
                <div className="mb-6 border-l-4 border-primary rounded-lg bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge>Your Role: {playerProfile.profile_name}</Badge>
                  </div>
                  <div className="prose prose-sm max-w-none text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {playerProfile.private_briefing}
                    </ReactMarkdown>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    This briefing is private to your role. Other participants have different information.
                  </p>
                </div>
              )}
              <div className="prose prose-sm max-w-none text-sm sm:text-base prose-table:overflow-x-auto prose-td:border prose-td:px-3 prose-td:py-2 prose-th:border prose-th:px-3 prose-th:py-2 prose-th:bg-muted/50">
                {session?.simulation.background_content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {session.simulation.background_content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground">No background content provided.</p>
                )}
              </div>
              {dataBlocks.length > 0 && (
                <div className="mt-6 space-y-4">
                  {dataBlocks.map((block) => (
                    <DataBlockRenderer
                      key={block.id}
                      block={block as Parameters<typeof DataBlockRenderer>[0]["block"]}
                    />
                  ))}
                </div>
              )}
              <Separator className="my-4 sm:my-6" />
              <div className="flex justify-end">
                {returnToStep != null ? (
                  <Button
                    onClick={() => {
                      setCurrentStep(returnToStep);
                      setReturnToStep(null);
                      if (returnToConsequence) setShowConsequence(true);
                      setReturnToConsequence(false);
                    }}
                    variant="outline"
                    className="min-h-[48px] w-full sm:w-auto"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                    {returnToStep >= 2 && returnToStep <= 4
                      ? `Back to Decision ${returnToStep - 1}`
                      : returnToStep === 5
                        ? "Back to Reflection"
                        : "Back"}
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentStep(2)} className="min-h-[48px] w-full sm:w-auto">
                    Continue to Decisions
                    <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const goToScenario = (fromStep: number, fromConsequence: boolean) => {
    setReturnToStep(fromStep);
    setReturnToConsequence(fromConsequence);
    setCurrentStep(1);
  };

  // Decision screens (steps 2, 3, 4)
  if (currentStep >= 2 && currentStep <= 4) {
    const decisionIndex = currentStep - 2;
    const decision = decisions[decisionIndex];

    // #region agent log
    if (!decision) {
      fetch('http://127.0.0.1:7442/ingest/e3c66b5a-7991-4a9b-8675-349b01d5f1fb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f8666f'},body:JSON.stringify({sessionId:'f8666f',location:'play/page.tsx:decisionBlock',message:'!decision skip to reflection',data:{currentStep,decisionIndex,decisionsLength:decisions.length},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      setCurrentStep(5);
      return null;
    }
    // #endregion

    // Show consequence after submission
    if (showConsequence) {
      return (
        <div className="min-h-screen bg-muted/50 py-4 sm:py-8 px-3 sm:px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <Badge variant="secondary" className="w-fit mb-2">Consequence</Badge>
                <CardTitle className="text-lg sm:text-xl">Decision {decision.order_num} Result</CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-4">
                <div className="p-4 sm:p-6 bg-muted rounded-lg">
                  <p className="text-base sm:text-lg break-words">{currentConsequence || "Your choice has been recorded."}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => goToScenario(currentStep, true)}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <BookOpen className="mr-2 h-4 w-4 shrink-0" />
                  View scenario
                </Button>
                <div className="flex justify-end pt-2">
                  <Button onClick={continueToNext} className="min-h-[48px] w-full sm:w-auto">
                    {decisionIndex < 2 ? "Next Decision" : "Continue to Reflection"}
                    <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-linear-to-b from-muted/30 to-muted/60 py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Button
            variant="outline"
            onClick={() => goToScenario(currentStep, false)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            <BookOpen className="mr-2 h-4 w-4 shrink-0" />
            View scenario
          </Button>

          {/* Decision prompt – collapsible so you can hide it after reading */}
          <Collapsible defaultOpen={true} className="group">
            <Card className="border-muted/80 bg-card/95 shadow-sm overflow-hidden p-0 gap-0">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full text-left px-4 sm:px-6 py-4 min-h-[48px] flex items-center justify-between gap-3 bg-transparent hover:bg-muted/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-xl"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge variant="secondary" className="shrink-0">Decision {decision.order_num} of 3</Badge>
                    <span className="font-medium text-foreground/90 truncate group-data-[state=open]:inline group-data-[state=closed]:hidden">What decision do you need to make?</span>
                    <span className="font-medium text-muted-foreground truncate group-data-[state=open]:hidden group-data-[state=closed]:inline">Tap to view question</span>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 sm:px-6 pb-5 pt-0 border-t border-border/50">
                  <p className="text-sm sm:text-[15px] leading-relaxed text-foreground/90 break-words">{decision.prompt}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-3">Select an option below and add justification if you like.</p>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Options – each option is collapsible (title visible, expand for description) */}
          <Card className="border-muted/80 bg-card/95 shadow-sm">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-medium">Choose an option</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Pick one and optionally expand to read more</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-6">
              <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption}>
                {decision.options.map((option) => (
                  <Collapsible key={option.id} className="group/option">
                    <div
                      className={`rounded-xl border-2 transition-all duration-200 ${
                        selectedOption === option.id
                          ? "border-primary/60 bg-primary/5 shadow-sm"
                          : "border-border/60 bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 p-3 sm:p-4 min-h-[48px] cursor-pointer"
                        onClick={() => setSelectedOption(option.id)}
                      >
                        <RadioGroupItem value={option.id} id={option.id} className="mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={option.id} className="text-sm sm:text-[15px] font-medium cursor-pointer text-foreground/95 break-words">
                            {option.label}. {option.title}
                          </Label>
                        </div>
                        {option.description && (
                          <CollapsibleTrigger
                            asChild
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          >
                            <span className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground shrink-0 p-1 rounded">
                              <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/option:rotate-90" />
                              <span className="sr-only">Toggle details</span>
                            </span>
                          </CollapsibleTrigger>
                        )}
                      </div>
                      {option.description && (
                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-0 pl-9 border-t border-border/40">
                            <p className="text-sm text-muted-foreground leading-relaxed">{option.description}</p>
                          </div>
                        </CollapsibleContent>
                      )}
                    </div>
                  </Collapsible>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Justification – collapsible, collapsed by default */}
          <Collapsible defaultOpen={false} className="group">
            <Card className="border-muted/80 bg-card/95 shadow-sm overflow-hidden p-0 gap-0">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full text-left px-4 sm:px-6 py-4 min-h-[48px] flex items-center justify-between gap-3 bg-transparent hover:bg-muted/50 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="text-sm font-medium text-muted-foreground">Add justification (optional)</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-5 pt-0 border-t border-border/50">
                  <Label htmlFor="justification" className="sr-only">Justification</Label>
                  <Textarea
                    id="justification"
                    placeholder="Explain your reasoning..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={3}
                    className="resize-none bg-muted/30 border-border/60"
                  />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              onClick={submitDecision}
              disabled={!selectedOption || submitting}
              className="shadow-sm min-h-[48px] w-full sm:w-auto"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Decision
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Reflection screen
  if (currentStep === 5) {
    return (
      <div className="min-h-screen bg-muted/50 py-4 sm:py-8 px-3 sm:px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Button
            variant="outline"
            onClick={() => goToScenario(5, false)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            <BookOpen className="mr-2 h-4 w-4 shrink-0" />
            View scenario
          </Button>

          <Card>
            <CardHeader className="px-4 sm:px-6">
              <Badge variant="secondary" className="w-fit mb-2">Reflection</Badge>
              <CardTitle className="text-lg sm:text-xl">Reflect on Your Experience</CardTitle>
              <CardDescription className="text-sm">Take a moment to think about what you learned</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6">
              {reflectionQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label className="text-sm sm:text-base">{question.question}</Label>
                  <Textarea
                    placeholder="Your thoughts..."
                    value={reflectionAnswers[question.id] || ""}
                    onChange={(e) => setReflectionAnswers(prev => ({
                      ...prev,
                      [question.id]: e.target.value
                    }))}
                    rows={4}
                    className="min-h-[100px] text-base"
                  />
                </div>
              ))}

              <div className="flex justify-end">
                <Button onClick={submitReflection} disabled={submitting} className="min-h-[48px] w-full sm:w-auto">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Simulation
                  <Check className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Results screen
  return (
    <div className="min-h-screen bg-muted/50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl">Simulation Complete!</CardTitle>
            <CardDescription>Thank you for participating, {participantName}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-center mb-4 sm:mb-6">
              <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                {totalScore} / {maxScore}
              </div>
              <p className="text-muted-foreground text-sm">Total Score</p>
            </div>

            <Separator className="my-4 sm:my-6" />

            <div className="space-y-3">
              <h4 className="font-medium text-sm sm:text-base">Your Decisions</h4>
              {decisions.map((decision, index) => {
                const response = myResponses.find(r => r.decision_id === decision.id);
                const selectedOpt = decision.options.find(o => o.id === response?.option_id);
                return (
                  <div key={decision.id} className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg min-h-[52px]">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">Decision {index + 1}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {selectedOpt ? `${selectedOpt.label}. ${selectedOpt.title}` : "No response"}
                      </p>
                    </div>
                    <Badge variant={response?.score === 3 ? "default" : "secondary"} className="shrink-0">
                      +{response?.score || 0}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <Separator className="my-4 sm:my-6" />

            <FeedbackCard
              simulationId={session?.simulation.id || ""}
              sessionId={session?.id}
              participantId={participantId || undefined}
              feedbackType="post_session"
              role="student"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
