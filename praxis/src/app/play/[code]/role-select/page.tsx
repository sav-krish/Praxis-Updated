"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RolePicker, type SimulationRoleOption } from "@/components/simulation/role-picker";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { PraxisLogo } from "@/components/praxis-logo";

export default function RoleSelectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [roles, setRoles] = useState<SimulationRoleOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [participantId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return (
      sessionStorage.getItem(`participant_code_${code.toUpperCase()}`) ||
      localStorage.getItem("praxis_guest_participant_id")
    );
  });
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    if (!participantId) {
      setLoadingRoles(false);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(
          `/api/play/session/${code.toUpperCase()}?participantId=${encodeURIComponent(participantId)}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | { availableProfiles?: Array<{ id: string; profile_name: string }> }
          | null;
        if (!response.ok) {
          if (response.status === 403) {
            sessionStorage.removeItem(`participant_code_${code.toUpperCase()}`);
            if (localStorage.getItem("praxis_active_session_code") === code.toUpperCase()) {
              localStorage.removeItem("praxis_active_session_code");
              localStorage.removeItem("praxis_guest_participant_id");
            }
            router.replace(`/join?code=${code.toUpperCase()}`);
            return;
          }
          throw new Error("Could not load simulation roles");
        }

        const availableRoles = (payload?.availableProfiles ?? []).map((profile) => ({
          id: profile.id,
          title: profile.profile_name,
        }));
        setRoles(availableRoles);
        if (availableRoles.length === 0) {
          router.replace(`/play/${code.toUpperCase()}?roleSelected=1`);
        }
      } catch {
        toast.error("Could not load this simulation's roles");
      } finally {
        setLoadingRoles(false);
      }
    })();
  }, [code, participantId, router]);

  const handleRandomAssign = () => {
    const random = roles[Math.floor(Math.random() * roles.length)];
    setSelectedRole(random?.id ?? null);
  };

  const handleEnterBriefing = async () => {
    if (!selectedRole || !participantId) {
      toast.error("Please select a role first");
      return;
    }
    const selectedProfile = roles.find((role) => role.id === selectedRole);
    try {
      const response = await fetch(`/api/play/session/${code.toUpperCase()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, profileId: selectedRole }),
      });
      if (!response.ok) {
        if (response.status === 403) {
          sessionStorage.removeItem(`participant_code_${code.toUpperCase()}`);
          router.replace(`/join?code=${code.toUpperCase()}`);
          return;
        }
        throw new Error("Could not save role");
      }
      sessionStorage.setItem(`role_${code.toUpperCase()}`, selectedRole);
      if (selectedProfile) {
        sessionStorage.setItem(`role_label_${code.toUpperCase()}`, selectedProfile.title);
      }
      router.push(`/play/${code.toUpperCase()}?roleSelected=1`);
    } catch {
      toast.error("Could not assign that role. Please try again.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4">
          <PraxisLogo size="navbar" priority />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
        <div className="px-3 py-4 sm:px-4 sm:py-8">
          <div className="max-w-3xl mx-auto">
            {loadingRoles ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading scenario roles…</div>
            ) : (
              <RolePicker
                roles={roles}
                selectedRole={selectedRole}
                onSelectRole={setSelectedRole}
                onRandomAssign={handleRandomAssign}
                onEnterBriefing={handleEnterBriefing}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
