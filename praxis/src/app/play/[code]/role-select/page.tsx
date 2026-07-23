"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RolePicker, RoleType } from "@/components/simulation/role-picker";

export default function RoleSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlCode = searchParams.get("code") || "";
  const pathCode = pathname.split("/")[2] || "";
  const code = urlCode || pathCode;
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [missingKeys, setMissingKeys] = useState(false);

  useEffect(() => {
    if (!code) {
      router.push("/join");
      return;
    }
    const upperCode = code.toUpperCase();
    const storedId = sessionStorage.getItem(`participant_${upperCode}`) || sessionStorage.getItem(`participant_${upperCode}`) || null;
    const storedSessionId = sessionStorage.getItem(`session_${upperCode}`) || sessionStorage.getItem(`session_${upperCode}`) || null;

    if (!storedId || !storedSessionId) {
      setMissingKeys(true);
      setLoading(false);
      return;
    }
    setParticipantId(storedId);
    setSessionId(storedSessionId);
    setLoading(false);
  }, [code, router]);

  const handleRandomAssign = () => {
    const roles: RoleType[] = ["marketing_lead", "cfo", "customer_rep"];
    const random = roles[Math.floor(Math.random() * roles.length)];
    setSelectedRole(random);
  };

  const handleEnterBriefing = async () => {
    if (!selectedRole || !participantId || !sessionId) return;
    setSubmitting(true);
    const supabase = createClient();

    const roleMap: Record<string, string> = {
      marketing_lead: "marketing lead",
      cfo: "cfo",
      customer_rep: "customer rep",
    };
    const targetName = roleMap[selectedRole];

    // Find profile by exact name match first
    const { data: profile } = await supabase
      .from("simulation_profiles")
      .select("id")
      .eq("simulation_id", sessionId)
      .ilike("profile_name", targetName)
      .maybeSingle();

    if (profile) {
      await supabase.from("participants").update({ profile_id: profile.id }).eq("id", participantId);
    }

    toast.success("Role selected!");
    router.push(`/play/${code.toUpperCase()}`);
    setTimeout(() => router.refresh(), 50);
  };

  const retry = () => {
    setMissingKeys(false);
    setLoading(true);
    setSelectedRole(null);
    window.setTimeout(() => setLoading(false), 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (missingKeys) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 dark:bg-[#292724] px-4 py-6">
        <Card className="w-full max-w-md dark:bg-zinc-900 dark:border-zinc-700">
          <CardContent className="p-6 sm:p-8 space-y-4 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">Session data is missing from this browser.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={retry} className="min-h-[44px]">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
              <Button variant="outline" onClick={() => router.push(`/join?code=${code}`)} className="min-h-[44px]">
                Back to Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 dark:bg-[#292724] px-4 py-6">
      <Card className="w-full max-w-3xl dark:bg-zinc-900 dark:border-zinc-700">
        <CardContent className="p-6 sm:p-8">
          <RolePicker
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            onRandomAssign={handleRandomAssign}
            onEnterBriefing={handleEnterBriefing}
          />
        </CardContent>
      </Card>
    </div>
  );
}
