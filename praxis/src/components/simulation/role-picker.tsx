"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export interface SimulationRoleOption {
  id: string;
  title: string;
}

interface RolePickerProps {
  roles: SimulationRoleOption[];
  selectedRole: string | null;
  onSelectRole: (role: string) => void;
  onRandomAssign: () => void;
  onEnterBriefing: () => void;
}

export function RolePicker({ roles, selectedRole, onSelectRole, onRandomAssign, onEnterBriefing }: RolePickerProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">Choose Your Role</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pick a role that fits your perspective, or let us assign one for you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {roles.map((role) => {
          const active = selectedRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelectRole(role.id)}
              className={`text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                active
                  ? "border-primary/70 bg-primary/5 shadow-sm"
                  : "border-border/70 bg-muted/40 hover:border-muted-foreground/40 hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{role.title}</span>
                <Badge variant="secondary" className="text-xs">Scenario role</Badge>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Continue to receive the private briefing for this perspective.
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onRandomAssign}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Surprise Me
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          onClick={onEnterBriefing}
          disabled={!selectedRole}
          className="w-full sm:w-auto min-h-[48px]"
        >
          Enter briefing room
          <span className="ml-2">→</span>
        </Button>
      </div>
    </div>
  );
}
