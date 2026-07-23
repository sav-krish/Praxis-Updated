"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataBlockRenderer } from "@/components/simulation/DataBlockRenderer";
import dynamic from "next/dynamic";
import {
  MessageSquare,
  FileText,
  BarChart3,
  ArrowRight,
  BookOpen,
  Clock,
  Users,
  TrendingUp,
  DollarSign,
  Target,
  Star,
} from "lucide-react";

const MarkdownBody = dynamic(
  () => import("@/components/ui/markdown-body").then((m) => m.MarkdownBody),
  {
    ssr: false,
    loading: () => (
      <div className="h-20 animate-pulse rounded-md bg-muted/40 dark:bg-zinc-800" aria-hidden />
    ),
  }
);

interface Source {
  id: string;
  label: string;
  url?: string | null;
  source_type?: string | null;
}

interface DataBlock {
  id: string;
  block_type: string;
  title: string | null;
  data: unknown;
}

interface DashboardMetric {
  label: string;
  value: string;
  change?: string;
  direction?: "up" | "down";
  icon: typeof TrendingUp;
}

interface BriefingCenterProps {
  backgroundContent: string | null;
  dataBlocks: DataBlock[];
  sources: Source[];
  title: string;
  estimatedMinutes?: number | null;
  onGoToDecision?: () => void;
}

interface SlackMessage {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  isHighlight?: boolean;
}

const slackMessages: SlackMessage[] = [
  {
    id: "1",
    author: "Sarah Chen",
    avatar: "SC",
    content: "Team — we're seeing some concerning signals from our user base. Retention dropped 12% this month. I think we need to re-evaluate our targeting strategy before we scale further.",
    timestamp: "9:42 AM",
    isHighlight: true,
  },
  {
    id: "2",
    author: "Mark Rivera",
    avatar: "MR",
    content: "Agreed. The broad demographic targeting isn't converting. We're spending 40% of budget on acquisition but the 30-day retention for those cohorts is below 8%.",
    timestamp: "9:44 AM",
  },
  {
    id: "3",
    author: "Jordan Lee",
    avatar: "JL",
    content: "From a numbers standpoint, if we narrow our focus to the 25-40 age bracket that showed 22% higher engagement in the pilot, we could reduce CAC by ~35%.",
    timestamp: "9:47 AM",
  },
  {
    id: "4",
    author: "Sarah Chen",
    avatar: "SC",
    content: "But we need to be careful. Over-narrowing could alienate our existing user base. Let's look at the data more carefully before jumping.",
    timestamp: "9:49 AM",
    isHighlight: true,
  },
];

const dashboardMetrics: DashboardMetric[] = [
  {
    label: "Downloads",
    value: "24,891",
    change: "+12%",
    direction: "up",
    icon: TrendingUp,
  },
  {
    label: "Ad Spend",
    value: "$187K",
    change: "+8%",
    direction: "up",
    icon: DollarSign,
  },
  {
    label: "Pilot Retention",
    value: "22.4%",
    change: "-3.2%",
    direction: "down",
    icon: Target,
  },
  {
    label: "NPS",
    value: "42",
    change: "+5",
    direction: "up",
    icon: Users,
  },
];

const surveyResults = [
  { painPoint: "Too expensive", percentage: 42 },
  { painPoint: "Poor onboarding", percentage: 31 },
  { painPoint: "Missing features", percentage: 18 },
  { painPoint: "Bad support", percentage: 9 },
];

export function BriefingCenter({
  backgroundContent,
  dataBlocks,
  sources,
  title,
  estimatedMinutes,
  onGoToDecision,
}: BriefingCenterProps) {
  const [activeTab, setActiveTab] = useState("slack");

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Tabbed Briefing Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <TabsList className="dark:bg-zinc-800 dark:border-zinc-700">
            <TabsTrigger value="slack" className="flex items-center gap-1.5 dark:text-zinc-400 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-zinc-100">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Slack Thread</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="scenario" className="flex items-center gap-1.5 dark:text-zinc-400 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-zinc-100">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Full Scenario</span>
              <span className="sm:hidden">Doc</span>
            </TabsTrigger>
          </TabsList>

          {estimatedMinutes && (
            <Badge variant="secondary" className="dark:text-zinc-300 dark:bg-zinc-800">
              <Clock className="h-3 w-3 mr-1" />
              ~{estimatedMinutes} min read
            </Badge>
          )}
        </div>

        {/* Tab A: Slack Thread */}
        <TabsContent value="slack" className="mt-0 space-y-4">
          <div className="flex gap-4 flex-col lg:flex-row">
            {/* Slack Thread Feed */}
            <div className="flex-1 min-w-0">
              <Card className="dark:border-zinc-700 dark:bg-zinc-900">
                <CardHeader className="pb-3 px-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/40">
                        <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base dark:text-zinc-100"># strategy-discussion</CardTitle>
                        <CardDescription className="text-xs dark:text-zinc-400">Company-wide thread</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="dark:text-zinc-400 dark:border-zinc-600">
                      <Users className="h-3 w-3 mr-1" />
                      8 online
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 space-y-2">
                  {/* Channel header */}
                  <div className="flex items-center gap-2 px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <BookOpen className="h-3 w-3" />
                    <span>Channel: <strong className="text-zinc-700 dark:text-zinc-300">#strategy</strong></span>
                    <span className="text-zinc-300 dark:text-zinc-600">|</span>
                    <span>Thread: Re-targeting strategy Q3</span>
                  </div>

                  {/* Messages */}
                  {slackMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={[
                        "flex items-start gap-3 p-3 rounded-lg transition-colors",
                        msg.isHighlight
                          ? "bg-amber-50 dark:bg-amber-900/15 border-l-2 border-amber-400 dark:border-amber-500"
                          : "bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {msg.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {msg.author}
                          </span>
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            {msg.timestamp}
                          </span>
                          {msg.isHighlight && (
                            <Badge variant="default" className="text-[9px] h-4 px-1.5 dark:bg-amber-600 dark:text-white">
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5 leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Live Dashboard Sidebar */}
            <div className="w-full lg:w-80 shrink-0 space-y-3">
              {/* Key Metric Widgets */}
              <Card className="dark:border-zinc-700 dark:bg-zinc-900">
                <CardHeader className="pb-2 px-4">
                  <CardTitle className="text-sm flex items-center gap-2 dark:text-zinc-100">
                    <BarChart3 className="h-4 w-4 text-amber-500" />
                    Live Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 space-y-3">
                  {dashboardMetrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <div
                        key={metric.label}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/80"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white dark:bg-zinc-700 shadow-sm">
                            <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{metric.label}</p>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{metric.value}</p>
                          </div>
                        </div>
                        <span className={[
                          "text-xs font-medium shrink-0",
                          metric.direction === "up"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400",
                        ].join(" ")}>
                          {metric.change}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Survey Results */}
              <Card className="dark:border-zinc-700 dark:bg-zinc-900">
                <CardHeader className="pb-2 px-4">
                  <CardTitle className="text-sm flex items-center gap-2 dark:text-zinc-100">
                    <Star className="h-4 w-4 text-amber-500" />
                    Pain Point Survey
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 space-y-2">
                  {surveyResults.map((item) => (
                    <div key={item.painPoint} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600 dark:text-zinc-300 truncate">{item.painPoint}</span>
                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">{item.percentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Go to Decision CTA */}
              <Button
                onClick={onGoToDecision}
                className="w-full min-h-[48px]"
              >
                Go to decision
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab B: Full Scenario Document */}
        <TabsContent value="scenario" className="mt-0">
          <div className="flex gap-4 flex-col lg:flex-row">
            {/* Document Content */}
            <div className="flex-1 min-w-0">
              <Card className="dark:border-zinc-700 dark:bg-zinc-900">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="text-lg dark:text-zinc-100">{title}</CardTitle>
                  <CardDescription className="dark:text-zinc-400">
                    Full scenario document with supporting data
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 space-y-6">
                  {backgroundContent ? (
                    <div className="dark:text-zinc-200">
                      <MarkdownBody className="prose prose-sm max-w-none dark:prose-invert">
                        {backgroundContent}
                      </MarkdownBody>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No background content provided.
                    </p>
                  )}

                  {/* Data Blocks */}
                  {dataBlocks.length > 0 && (
                    <div className="space-y-4">
                      <Separator className="dark:bg-zinc-700" />
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Supporting Data
                      </h3>
                      {dataBlocks.map((block) => (
                        <DataBlockRenderer
                          key={block.id}
                          block={block as Parameters<typeof DataBlockRenderer>[0]["block"]}
                        />
                      ))}
                    </div>
                  )}

                  {/* Sources */}
                  {sources.length > 0 && (
                    <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                        Sources & References
                      </h4>
                      <ol className="space-y-2 list-none pl-0">
                        {sources.map((s, idx) => (
                          <li key={s.id} className="flex items-start gap-2.5 text-sm leading-relaxed">
                            <span className="shrink-0 mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums w-5 text-right">
                              {idx + 1}.
                            </span>
                            <span className="min-w-0">
                              {s.url ? (
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline underline-offset-2 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                                >
                                  {s.label}
                                </a>
                              ) : (
                                <span className="text-zinc-700 dark:text-zinc-300">{s.label}</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Go to Decision CTA for doc tab too */}
            <div className="w-full lg:w-48 shrink-0">
              <div className="lg:sticky lg:top-24">
                <Button
                  onClick={onGoToDecision}
                  className="w-full min-h-[48px]"
                >
                  Go to decision
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}