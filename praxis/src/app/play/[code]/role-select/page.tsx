"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { RolePicker } from "@/components/simulation/role-picker";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

type RoleKey = "marketing_lead" | "cfo" | "customer_rep";

export default function RoleSelectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    const pid = sessionStorage.getItem(`participant_${code.toUpperCase()}`);
    if (pid) {
      setParticipantId(pid);
    }
  }, [code]);

  const handleRandomAssign = () => {
    const roles: RoleKey[] = ["marketing_lead", "cfo", "customer_rep"];
    const random = roles[Math.floor(Math.random() * roles.length)];
    setSelectedRole(random);
  };

  const handleEnterBriefing = async () => {
    if (!selectedRole || !participantId) {
      toast.error("Please select a role first");
      return;
    }
    setLoading(true);
    try {
      await supabase
        .from("participants")
        // @ts-expect-error participant selected_role may not exist in generated types
        .update({ selected_role: selectedRole })
        .eq("id", participantId);
      router.push(`/play/${code.toUpperCase()}?roleSelected=1`);
    } catch (error) {
      logger.error(error);
      toast.error("Failed to save role selection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
        <div className="px-3 py-4 sm:px-4 sm:py-8">
          <div className="max-w-3xl mx-auto">
            <RolePicker
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              onRandomAssign={handleRandomAssign}
              onEnterBriefing={handleEnterBriefing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}