"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp } from "lucide-react";

export interface RoleVoteBreakdown {
  roleName: string;
  roleId: string;
  totalVoters: number;
  votesByOption: {
    optionId: string;
    optionLabel: string;
    count: number;
    percentage: number;
  }[];
}

interface LeaderboardPanelProps {
  decisions: {
    id: string;
    options: {
      id: string;
      label: string;
      title: string;
    }[];
  }[];
  participants: {
    id: string;
    profile_id: string | null;
    team_id?: string | null;
  }[];
  profiles: {
    id: string;
    profile_name: string;
  }[];
  teamDecisions: {
    decision_id: string;
    option_id: string;
    team_id: string | null;
  }[];
  mode: "individual" | "teams";
  currentDecisionId?: string;
}

export function LeaderboardPanel({
  decisions,
  participants,
  profiles,
  teamDecisions,
  mode,
  currentDecisionId,
}: LeaderboardPanelProps) {
  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach(p => map.set(p.id, p.profile_name));
    return map;
  }, [profiles]);

  const roleBreakdowns = useMemo(() => {
    if (!decisions.length) return [];

    const targetDecision = currentDecisionId
      ? decisions.find(d => d.id === currentDecisionId) ?? decisions[0]
      : decisions[0];

    const roleGroups = new Map<string, {
      roleName: string;
      roleId: string;
      voters: Set<string>;
      optionCounts: Map<string, number>;
    }>();

    // Initialize with all roles
    profiles.forEach(p => {
      if (!roleGroups.has(p.id)) {
        roleGroups.set(p.id, {
          roleName: p.profile_name,
          roleId: p.id,
          voters: new Set(),
          optionCounts: new Map(),
        });
      }
    });

    // Assign participants to roles
    participants.forEach(p => {
      if (p.profile_id && roleGroups.has(p.profile_id)) {
        roleGroups.get(p.profile_id)!.voters.add(p.id);
      }
    });

    // Count votes by role
    teamDecisions.forEach(td => {
      if (td.decision_id === targetDecision.id) {
        const participant = participants.find(p => p.team_id === td.team_id);
        if (participant?.profile_id && roleGroups.has(participant.profile_id)) {
          const group = roleGroups.get(participant.profile_id)!;
          const current = group.optionCounts.get(td.option_id) || 0;
          group.optionCounts.set(td.option_id, current + 1);
        }
      }
    });

    const result: RoleVoteBreakdown[] = [];
    roleGroups.forEach(group => {
      if (group.voters.size === 0) return;
      const totalVotes = Array.from(group.optionCounts.values()).reduce((a, b) => a + b, 0);
      const optionBreakdowns = targetDecision.options.map(opt => {
        const count = group.optionCounts.get(opt.id) || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return {
          optionId: opt.id,
          optionLabel: opt.label,
          count,
          percentage,
        };
      });
      result.push({
        roleName: group.roleName,
        roleId: group.roleId,
        totalVoters: group.voters.size,
        votesByOption: optionBreakdowns,
      });
    });

    return result.sort((a, b) => a.roleName.localeCompare(b.roleName));
  }, [decisions, participants, profiles, teamDecisions, currentDecisionId]);

  if (!decisions.length || !roleBreakdowns.length) {
    return null;
  }

  const targetDecision = currentDecisionId
    ? decisions.find(d => d.id === currentDecisionId) ?? decisions[0]
    : decisions[0];

  return (
    <Card className="dark:border-zinc-700 dark:bg-zinc-900">
      <CardHeader className="px-4 sm:px-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          Vote Distribution by Role
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-4">
        {roleBreakdowns.map(breakdown => (
          <div key={breakdown.roleId} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="text-xs shrink-0">
                  <Users className="h-3 w-3 mr-1" />
                  {breakdown.roleName}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  {breakdown.totalVoters} voter{breakdown.totalVoters !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              {breakdown.votesByOption.map(vote => (
                <div key={vote.optionId} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-5 shrink-0">{vote.optionLabel}.</span>
                  <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                      style={{ width: `${vote.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                    {vote.count} vote{vote.count !== 1 ? "s" : ""} ({vote.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}