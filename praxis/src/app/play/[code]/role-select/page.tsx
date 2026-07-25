"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { RolePicker, type SimulationRoleOption } from "@/components/simulation/role-picker";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, ListChecks, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [showPreface, setShowPreface] = useState(true);
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
        if (!response.ok) throw new Error("Could not load simulation roles");

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
      if (!response.ok) throw new Error("Could not save role");
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
          <Image src="/new_logo.png" alt="Praxis" width={300} height={73} className="h-12 w-auto" priority />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-muted/50">
        <div className="px-3 py-4 sm:px-4 sm:py-8">
          <div className="max-w-3xl mx-auto">
            {showPreface ? (
              <section className="rounded-3xl border bg-card p-6 shadow-xl sm:p-9">
                <div className="mb-6 flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge variant="secondary">Before you begin</Badge>
                    <h1 className="mt-2 text-2xl font-bold">Prepare for your simulation</h1>
                    <p className="mt-1 text-muted-foreground">Understand the scenario, take a role, and make evidence-based decisions.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    ["1", "Get assigned a role", "Choose a professional lens or ask Praxis to assign one."],
                    ["2", "Read the briefing", "Review the scenario, evidence, metrics, and role context."],
                    ["3", "Make 3 decisions", "Choose an option and explain the reasoning behind it."],
                    ["4", "See the consequences", "Receive decision-specific impact and AI feedback."],
                  ].map(([number, title, description]) => (
                    <div key={number} className="flex gap-3 rounded-xl border bg-muted/40 p-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{number}</span>
                      <div>
                        <p className="font-semibold">{title}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="my-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> ~15 min</span>
                  <span className="flex items-center gap-1"><ListChecks className="h-4 w-4" /> 3 decisions</span>
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Classroom ready</span>
                </div>
                <Button className="w-full min-h-12" onClick={() => setShowPreface(false)}>
                  Got it, let&apos;s start →
                </Button>
              </section>
            ) : (
              loadingRoles ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Loading scenario roles…</div>
              ) : (
                <RolePicker
                  roles={roles}
                  selectedRole={selectedRole}
                  onSelectRole={setSelectedRole}
                  onRandomAssign={handleRandomAssign}
                  onEnterBriefing={handleEnterBriefing}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
