"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { MarkdownBody } from "@/components/ui/markdown-body";
import { cn } from "@/lib/utils";
import type { AdminAnalyticsPayload, AdminAnalyticsViewData } from "@/lib/admin-analytics";

export type { AdminAnalyticsPayload, AdminAnalyticsViewData };

const PROF_PAGE_SIZE = 15;
const SIM_PAGE_SIZE = 12;

const PROF_BAR_CHART_CONFIG = {
  count: { label: "Simulations", color: "var(--chart-1)" },
} satisfies ChartConfig;

const SIM_BAR_CHART_CONFIG = {
  sessions: { label: "Sessions", color: "var(--chart-2)" },
} satisfies ChartConfig;

const TREND_RANGE_OPTIONS = [
  { value: "7d", days: 7, label: "Last 7 days" },
  { value: "30d", days: 30, label: "Last 30 days" },
  { value: "90d", days: 90, label: "Last 3 months" },
  { value: "180d", days: 180, label: "Last 6 months" },
  { value: "365d", days: 365, label: "Last year" },
] as const;

type TrendRangeValue = (typeof TREND_RANGE_OPTIONS)[number]["value"];

function sliceTrendSeries(
  full365: { date: string; count: number }[],
  days: number
): { date: string; count: number }[] {
  return full365.slice(-days);
}

function formatTooltipDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SESSIONS_TREND_CONFIG = {
  count: { label: "Sessions", color: "var(--chart-1)" },
} satisfies ChartConfig;

const PARTICIPANTS_TREND_CONFIG = {
  count: { label: "Joined", color: "var(--chart-2)" },
} satisfies ChartConfig;

const RESPONSES_TREND_CONFIG = {
  count: { label: "Responses", color: "var(--chart-3)" },
} satisfies ChartConfig;

function AdminTrendAreaBlock({
  title,
  data,
  gradientId,
  chartConfig,
  longRange,
}: {
  title: string;
  data: { date: string; count: number }[];
  gradientId: string;
  chartConfig: ChartConfig;
  longRange: boolean;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: longRange ? 16 : 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.75} />
              <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={longRange ? 36 : 28}
            tick={{ fontSize: longRange ? 9 : 10, fill: "var(--muted-foreground)" }}
            angle={longRange ? -35 : 0}
            textAnchor={longRange ? "end" : "middle"}
            height={longRange ? 48 : 28}
            interval={longRange ? Math.max(0, Math.floor(data.length / 14) - 1) : "preserveStartEnd"}
            tickFormatter={(value) => {
              const d = new Date(`${value}T12:00:00`);
              if (Number.isNaN(d.getTime())) return String(value);
              return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            allowDecimals={false}
            domain={[0, "auto"]}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as { date: string; count: number };
              return (
                <TooltipBox
                  title={formatTooltipDate(row.date)}
                  lines={[{ k: String(chartConfig.count?.label ?? "Count"), v: row.count }]}
                />
              );
            }}
          />
          <Area
            dataKey="count"
            type="linear"
            fill={`url(#${gradientId})`}
            stroke="var(--color-count)"
            strokeWidth={2}
            baseLine={0}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function TooltipBox({ title, lines }: { title: string; lines: { k: string; v: string | number }[] }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{title}</p>
      {lines.map((l) => (
        <p key={l.k} className="text-muted-foreground">
          {l.k}:{" "}
          <span className="font-semibold tabular-nums text-foreground">{l.v}</span>
        </p>
      ))}
    </div>
  );
}

function ScopeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-base font-semibold text-foreground">{title}</h2>;
}

function BarPaginator({
  page,
  pageSize,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  const canPrev = page > 0;
  const canNext = (page + 1) * pageSize < total;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5">
      <p className="text-xs text-muted-foreground tabular-nums">
        {total === 0 ? "No rows" : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={!canPrev}
          onClick={onPrev}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={!canNext}
          onClick={onNext}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AdminAnalyticsView({ data }: { data: AdminAnalyticsViewData }) {
  const { summary } = data;
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [profPage, setProfPage] = useState(0);
  const [simPage, setSimPage] = useState(0);
  const [timeRange, setTimeRange] = useState<TrendRangeValue>("30d");

  const trendWindowDays = useMemo(() => {
    const opt = TREND_RANGE_OPTIONS.find((o) => o.value === timeRange);
    return opt?.days ?? 30;
  }, [timeRange]);

  const longTrendWindow = trendWindowDays >= 90;

  const profTotal = data.simulationsPerProfessorAll.length;
  const simTotal = data.topSimulationsBySessionsAll.length;
  const profMaxPage = Math.max(0, Math.ceil(profTotal / PROF_PAGE_SIZE) - 1);
  const simMaxPage = Math.max(0, Math.ceil(simTotal / SIM_PAGE_SIZE) - 1);

  const profPageSafe = Math.min(profPage, profMaxPage);
  const simPageSafe = Math.min(simPage, simMaxPage);

  const profSlice = useMemo(
    () =>
      data.simulationsPerProfessorAll.slice(
        profPageSafe * PROF_PAGE_SIZE,
        profPageSafe * PROF_PAGE_SIZE + PROF_PAGE_SIZE
      ),
    [data.simulationsPerProfessorAll, profPageSafe]
  );

  const simSlice = useMemo(
    () =>
      data.topSimulationsBySessionsAll.slice(
        simPageSafe * SIM_PAGE_SIZE,
        simPageSafe * SIM_PAGE_SIZE + SIM_PAGE_SIZE
      ),
    [data.topSimulationsBySessionsAll, simPageSafe]
  );

  async function generateInsight() {
    setInsightLoading(true);
    setInsightError(null);
    try {
      const res = await fetch("/api/admin/analytics-insight", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Could not generate insight.");
      }
      if (typeof body.insight !== "string" || !body.insight.trim()) {
        throw new Error("Empty response.");
      }
      setInsightText(body.insight.trim());
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setInsightLoading(false);
    }
  }

  const profBarData = useMemo(
    () =>
      profSlice.map((r) => ({
        ...r,
        fullName: r.name,
        shortName: r.name.length > 18 ? `${r.name.slice(0, 16)}…` : r.name,
      })),
    [profSlice]
  );

  const topSimBarData = useMemo(
    () =>
      simSlice.map((r) => ({
        ...r,
        fullTitle: r.title,
        shortTitle: r.title.length > 22 ? `${r.title.slice(0, 20)}…` : r.title,
      })),
    [simSlice]
  );

  const sessionsTrend = useMemo(
    () => sliceTrendSeries(data.sessionsPerDay365, trendWindowDays),
    [data.sessionsPerDay365, trendWindowDays]
  );

  const participantsTrend = useMemo(
    () => sliceTrendSeries(data.participantsPerDay365, trendWindowDays),
    [data.participantsPerDay365, trendWindowDays]
  );

  const responsesTrend = useMemo(
    () => sliceTrendSeries(data.responsesPerDay365, trendWindowDays),
    [data.responsesPerDay365, trendWindowDays]
  );

  const axisTickMuted = { fill: "var(--muted-foreground)", fontSize: 11 };
  const axisTickMutedSm = { fill: "var(--muted-foreground)", fontSize: 10 };
  /** Tooltip band (Recharts may portal; use root --chart-* not scoped --color-*) */
  const barCursorProf = { fill: "var(--chart-1)", fillOpacity: 0.12 };
  const barCursorSim = { fill: "var(--chart-2)", fillOpacity: 0.12 };

  return (
    <div className="space-y-10">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI insight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" onClick={generateInsight} disabled={insightLoading}>
            {insightLoading ? "Generating…" : "Generate insight"}
          </Button>
          {insightError ? <p className="text-sm text-destructive">{insightError}</p> : null}
          {insightText ? (
            <MarkdownBody className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-muted/20 px-4 py-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground">
              {insightText}
            </MarkdownBody>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader title="Overview" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Professors" value={summary.professorCount} accent="primary" />
          <StatCard label="Simulations" value={summary.simulationCount} accent="primary" />
          <StatCard label="Sessions" value={summary.sessionsLast30NonPreview} accent="primary" />
          <StatCard label="Students joined" value={summary.participantsLast30} accent="primary" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="People &amp; access" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Student-mode profiles" value={summary.studentRoleCount} />
          <StatCard label="Active subscriptions" value={summary.subscriptionActiveCount} accent="primary" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Library" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Public simulations" value={summary.publicSimulationCount} />
          <StatCard label="Curated (Top Picks)" value={summary.pinnedSimulationCount} accent="primary" />
          <StatCard label="Favorites on public sims" value={summary.totalFavoritesOnPublic} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Activity" />
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Decision responses" value={summary.responsesLast30} accent="primary" />
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader title="Charts" />

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/30 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">Content by professor</CardTitle>
              <ScopeBadge label="All time" />
            </div>
          </CardHeader>
          <BarPaginator
            page={profPageSafe}
            pageSize={PROF_PAGE_SIZE}
            total={profTotal}
            onPrev={() => setProfPage((p) => Math.max(0, Math.min(p, profMaxPage) - 1))}
            onNext={() => setProfPage((p) => Math.min(profMaxPage, Math.min(p, profMaxPage) + 1))}
          />
          <CardContent className="pt-6">
            <ChartContainer
              id="admin-bar-professors"
              config={PROF_BAR_CHART_CONFIG}
              className="aspect-auto h-[min(420px,70vh)] w-full min-h-[280px] min-w-0"
            >
              <BarChart data={profBarData} layout="vertical" margin={{ left: 4, right: 24, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="adminBarProfGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-count)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
                <XAxis type="number" tick={axisTickMuted} allowDecimals={false} />
                <YAxis type="category" dataKey="shortName" width={108} tick={axisTickMutedSm} interval={0} />
                <Tooltip
                  cursor={barCursorProf}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const p = payload[0].payload as { fullName?: string; count?: number };
                    return (
                      <TooltipBox
                        title={p.fullName ?? "—"}
                        lines={[{ k: "Simulations", v: p.count ?? 0 }]}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="url(#adminBarProfGrad)"
                  radius={[0, 6, 6, 0]}
                  name="Simulations"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/30 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">Most-run simulations</CardTitle>
              <ScopeBadge label="All time" />
            </div>
          </CardHeader>
          <BarPaginator
            page={simPageSafe}
            pageSize={SIM_PAGE_SIZE}
            total={simTotal}
            onPrev={() => setSimPage((p) => Math.max(0, Math.min(p, simMaxPage) - 1))}
            onNext={() => setSimPage((p) => Math.min(simMaxPage, Math.min(p, simMaxPage) + 1))}
          />
          <CardContent className="pt-6">
            <ChartContainer
              id="admin-bar-simulations"
              config={SIM_BAR_CHART_CONFIG}
              className="aspect-auto h-[min(400px,65vh)] w-full min-h-[260px] min-w-0"
            >
              <BarChart data={topSimBarData} layout="vertical" margin={{ left: 4, right: 24, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="adminBarSimGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-sessions)" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="var(--color-sessions)" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
                <XAxis type="number" tick={axisTickMuted} allowDecimals={false} />
                <YAxis type="category" dataKey="shortTitle" width={128} tick={axisTickMutedSm} interval={0} />
                <Tooltip
                  cursor={barCursorSim}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const p = payload[0].payload as { fullTitle?: string; sessions?: number };
                    return (
                      <TooltipBox
                        title={p.fullTitle ?? "—"}
                        lines={[{ k: "Sessions", v: p.sessions ?? 0 }]}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="sessions"
                  fill="url(#adminBarSimGrad)"
                  radius={[0, 6, 6, 0]}
                  name="Sessions"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/80 pt-0 shadow-sm">
          <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-border/60 bg-muted/30 py-4 sm:flex-row sm:items-center">
            <CardTitle className="text-base">Activity over time</CardTitle>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TrendRangeValue)}>
              <SelectTrigger
                className="w-full rounded-lg sm:ml-auto sm:w-[180px]"
                aria-label="Chart time range"
                size="default"
              >
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {TREND_RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="rounded-lg">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-10 px-2 pt-6 sm:px-6 sm:pt-6">
            <AdminTrendAreaBlock
              title="Sessions per day"
              data={sessionsTrend}
              gradientId="adminFillSessions"
              chartConfig={SESSIONS_TREND_CONFIG}
              longRange={longTrendWindow}
            />
            <AdminTrendAreaBlock
              title="Students joined per day"
              data={participantsTrend}
              gradientId="adminFillParticipants"
              chartConfig={PARTICIPANTS_TREND_CONFIG}
              longRange={longTrendWindow}
            />
            <AdminTrendAreaBlock
              title="Decision responses per day"
              data={responsesTrend}
              gradientId="adminFillResponses"
              chartConfig={RESPONSES_TREND_CONFIG}
              longRange={longTrendWindow}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "primary";
}) {
  const bar = accent === "primary" ? "bg-primary" : "bg-border";
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className={cn("absolute left-0 top-0 h-1 w-full", bar)} />
      <div className="px-4 py-3 pt-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink dark:text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}
