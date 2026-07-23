"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Shuffle,
  Megaphone,
  TrendingUp,
  Heart,
  Zap,
} from "lucide-react";

export type RoleType = "marketing_lead" | "cfo" | "customer_rep";

interface RoleConfig {
  id: RoleType;
  title: string;
  lens: string;
  lensColor: string;
  bullets: string[];
  icon: typeof Megaphone;
}

const roles: RoleConfig[] = [
  {
    id: "marketing_lead",
    title: "Marketing Lead",
    lens: "Growth lens",
    lensColor: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    bullets: [
      "Acquisition, brand, message fit",
    ],
    icon: Megaphone,
  },
  {
    id: "cfo",
    title: "CFO",
    lens: "Cost lens",
    lensColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
    bullets: [
      "CAC, LTV, margin protection",
    ],
    icon: TrendingUp,
  },
  {
    id: "customer_rep",
    title: "Customer Rep",
    lens: "User lens",
    lensColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400",
    bullets: [
      "User empathy, trust, accessibility",
    ],
    icon: Heart,
  },
];

interface RolePickerProps {
  onSelectRole: (role: RoleType) => void;
  selectedRole?: RoleType | null;
  onRandomAssign?: () => void;
  onEnterBriefing?: () => void;
}

export function RolePicker({
  onSelectRole,
  selectedRole,
  onRandomAssign,
  onEnterBriefing,
}: RolePickerProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="secondary" className="dark:text-zinc-300 dark:bg-zinc-800">
          <Zap className="h-3 w-3 mr-1" />
          Step 1 of 4
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Pick your role
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto">
          Your role determines your perspective and shapes the arguments you will make
          throughout the simulation.
        </p>
      </div>

      {/* 3-Column Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelectRole(role.id)}
              className={[
                "relative flex flex-col text-left rounded-xl border-2 p-4 sm:p-5 transition-all duration-200 min-h-[180px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? "border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-md"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm",
              ].join(" ")}
            >
              {/* Icon */}
              <div
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-lg mb-3",
                  isSelected
                    ? "bg-amber-100 dark:bg-amber-800/40"
                    : "bg-zinc-100 dark:bg-zinc-700",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-5 w-5",
                    isSelected
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-zinc-500 dark:text-zinc-400",
                  ].join(" ")}
                />
              </div>

              {/* Title & Lens */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  {role.title}
                </span>
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    role.lensColor,
                  ].join(" ")}
                >
                  {role.lens}
                </span>
              </div>

              {/* Focus bullets */}
              <ul className="space-y-1 flex-1">
                {role.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-amber-500 dark:bg-amber-400 flex items-center justify-center">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {onRandomAssign && (
          <Button
            variant="outline"
            onClick={onRandomAssign}
            className="min-h-[44px] dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Random Assignment
          </Button>
        )}
        <Button
          disabled={!selectedRole}
          onClick={onEnterBriefing}
          className="min-h-[48px] px-6 text-base"
        >
          Enter briefing room
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}