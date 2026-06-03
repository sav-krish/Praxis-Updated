"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldInfoHint } from "@/components/ui/field-info-hint";
import { Badge } from "@/components/ui/badge";

interface OptionLite {
  id: string;
  label: string;
  title: string;
  score: number | null;
}

interface DecisionLite {
  id: string;
  prompt: string;
  options: OptionLite[];
}

interface ResponseLite {
  id: string;
  participant_id: string | null;
  team_id: string | null;
  decision_id: string;
  option_id: string;
  submitted_at: string | null;
}

interface ParticipantLite {
  id: string;
  joined_at?: string | null;
}

interface ReflectionResponseLite {
  participant_id: string | null;
  team_id: string | null;
  response: string;
}

interface DeterministicMetricsProps {
  decisions: DecisionLite[];
  responses: ResponseLite[];
  participants: ParticipantLite[];
  teams: { id: string }[];
  reflectionResponses: ReflectionResponseLite[];
  mode: "individual" | "teams";
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const STOPWORDS = new Set([
  "the","a","an","and","or","but","of","in","on","at","to","for","with","by","from","is","was","were","are","be","been","being","this","that","these","those","i","we","you","they","he","she","it","my","our","your","their","his","her","its","as","if","then","than","so","not","no","yes","do","did","does","done","have","has","had","will","would","can","could","should","may","might","just","really","very","much","more","less","also","too","about","into","over","under","up","down","out","off","because","while","when","where","what","which","who","whom","there","here","now","because","since","like","such","need","want","make","made","get","got","go","goes","went","come","came","still","even","each","every","any","all","some","most","many","few","one","two","three","actually","kind","sort","thing","things"
]);

export function DeterministicMetrics({
  decisions,
  responses,
  participants,
  teams,
  reflectionResponses,
  mode,
}: DeterministicMetricsProps) {
  // ---- Chart 1: Decision-by-decision option distribution (stacked bar) ----
  const distributionData = useMemo(() => {
    return decisions.map((d, idx) => {
      const decisionResponses = responses.filter((r) => r.decision_id === d.id);
      const total = decisionResponses.length || 1;
      const row: Record<string, string | number> = { name: `D${idx + 1}` };
      d.options.forEach((opt) => {
        const count = decisionResponses.filter((r) => r.option_id === opt.id).length;
        row[`${opt.label}`] = Math.round((count / total) * 100);
      });
      return row;
    });
  }, [decisions, responses]);

  // ---- Chart 2: Score histogram across actors ----
  const histogramData = useMemo(() => {
    const totals: number[] = [];
    const actors = mode === "teams" ? teams.map((t) => t.id) : participants.map((p) => p.id);
    actors.forEach((id) => {
      let sum = 0;
      decisions.forEach((d) => {
        const r = responses.find((r) =>
          r.decision_id === d.id &&
          (mode === "teams" ? r.team_id === id : r.participant_id === id),
        );
        if (!r) return;
        const opt = d.options.find((o) => o.id === r.option_id);
        sum += opt?.score ?? 0;
      });
      totals.push(sum);
    });
    const maxScore = decisions.length * 3;
    const buckets: { score: string; count: number }[] = [];
    for (let s = 0; s <= maxScore; s++) {
      buckets.push({ score: String(s), count: totals.filter((t) => t === s).length });
    }
    return buckets;
  }, [decisions, responses, participants, teams, mode]);

  // ---- Chart 3: Average time-to-decide per decision (line) ----
  const timeToDecideData = useMemo(() => {
    return decisions.map((d, idx) => {
      const sorted = [...responses]
        .filter((r) => r.decision_id === d.id && r.submitted_at)
        .map((r) => ({
          actor: mode === "teams" ? r.team_id : r.participant_id,
          ts: new Date(r.submitted_at as string).getTime(),
        }))
        .filter((r) => r.actor != null);

      if (idx === 0) {
        // anchor first decision against earliest joined_at if available, else 0
        const baseTimes = participants
          .map((p) => (p.joined_at ? new Date(p.joined_at).getTime() : null))
          .filter((t): t is number => t != null);
        const base = baseTimes.length ? Math.min(...baseTimes) : null;
        if (base == null) return { name: `D${idx + 1}`, seconds: 0 };
        const deltas = sorted.map((r) => Math.max(0, (r.ts - base) / 1000));
        const avg = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
        return { name: `D${idx + 1}`, seconds: Math.round(avg) };
      }

      const prev = decisions[idx - 1];
      const deltas: number[] = [];
      sorted.forEach((cur) => {
        const prevR = responses.find(
          (r) =>
            r.decision_id === prev.id &&
            (mode === "teams" ? r.team_id : r.participant_id) === cur.actor &&
            r.submitted_at,
        );
        if (!prevR?.submitted_at) return;
        deltas.push(Math.max(0, (cur.ts - new Date(prevR.submitted_at).getTime()) / 1000));
      });
      const avg = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
      return { name: `D${idx + 1}`, seconds: Math.round(avg) };
    });
  }, [decisions, responses, participants, mode]);

  // ---- Chart 4: Completion funnel ----
  const funnelData = useMemo(() => {
    const totalActors = mode === "teams" ? teams.length : participants.length;
    const startedActors = new Set(
      responses.map((r) => (mode === "teams" ? r.team_id : r.participant_id)).filter(Boolean),
    ).size;

    const completedActors = (() => {
      const ids = new Set<string>();
      const actors = mode === "teams" ? teams : participants;
      actors.forEach((a) => {
        const made = decisions.every((d) =>
          responses.some(
            (r) =>
              r.decision_id === d.id &&
              (mode === "teams" ? r.team_id === a.id : r.participant_id === a.id),
          ),
        );
        if (made) ids.add(a.id);
      });
      return ids.size;
    })();

    const reflectedActors = new Set(
      reflectionResponses
        .map((r) => (mode === "teams" ? r.team_id : r.participant_id))
        .filter(Boolean),
    ).size;

    return [
      { stage: "Joined", value: totalActors },
      { stage: "Started", value: startedActors },
      { stage: "Completed", value: completedActors },
      { stage: "Reflected", value: reflectedActors },
    ];
  }, [decisions, responses, reflectionResponses, participants, teams, mode]);

  // ---- Chart 5: Optimal-pick rate per decision (KPI cards) ----
  const optimalPickData = useMemo(() => {
    return decisions.map((d, idx) => {
      const decisionResponses = responses.filter((r) => r.decision_id === d.id);
      const total = decisionResponses.length || 1;
      const optimal = d.options.find((o) => (o.score ?? 0) === 3);
      const count = optimal
        ? decisionResponses.filter((r) => r.option_id === optimal.id).length
        : 0;
      return {
        index: idx + 1,
        prompt: d.prompt,
        rate: Math.round((count / total) * 100),
        n: decisionResponses.length,
        optimalLabel: optimal?.label,
      };
    });
  }, [decisions, responses]);

  // ---- Chart 6: Reflection word cloud (deterministic frequency) ----
  const wordCloudData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reflectionResponses) {
      const tokens = (r.response || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
      for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([word, count]) => ({ word, count }));
  }, [reflectionResponses]);

  const optionLabels = ["A", "B", "C"];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Chart 1: Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">Option distribution by decision</CardTitle>
              <FieldInfoHint className="shrink-0">
                Stacked share of A / B / C choices across each decision.
              </FieldInfoHint>
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis unit="%" stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  formatter={(v) => `${v}%`}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }}
                />
                <Legend />
                {optionLabels.map((lbl, i) => (
                  <Bar key={lbl} dataKey={lbl} stackId="dist" fill={CHART_COLORS[i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Score histogram */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">Score distribution</CardTitle>
              <FieldInfoHint className="shrink-0">
                How many {mode === "teams" ? "teams" : "participants"} landed on each total
                score.
              </FieldInfoHint>
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="score" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }}
                />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 3: Time-to-decide */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">Avg seconds to decide</CardTitle>
              <FieldInfoHint className="shrink-0">
                Mean time from the previous decision (or session start) to a submitted answer.
              </FieldInfoHint>
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeToDecideData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis unit="s" stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  formatter={(v) => `${v}s`}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }}
                />
                <Line type="monotone" dataKey="seconds" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 4, fill: "var(--chart-1)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 4: Completion funnel */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">Completion funnel</CardTitle>
              <FieldInfoHint className="shrink-0">
                Joined → started → completed → reflected. Drop-off helps you spot pacing issues.
              </FieldInfoHint>
            </div>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="stage" stroke="var(--muted-foreground)" fontSize={12} width={90} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chart 5: Optimal-pick KPI cards */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">Optimal-pick rate per decision</CardTitle>
            <FieldInfoHint className="shrink-0">
              Share of {mode === "teams" ? "teams" : "participants"} who chose the
              highest-scoring option. Quick read on where your students nail the call vs. struggle.
            </FieldInfoHint>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {optimalPickData.map((d) => (
              <div
                key={d.index}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0">D{d.index}</Badge>
                  {d.optimalLabel && (
                    <Badge variant="secondary" className="shrink-0">Best: {d.optimalLabel}</Badge>
                  )}
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-[color:var(--foreground)]">
                  {d.rate}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((d.rate / 100) * d.n)} of {d.n} chose the optimal option
                </p>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{d.prompt}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart 6: Reflection word cloud */}
      {wordCloudData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">Reflection vocabulary</CardTitle>
              <FieldInfoHint className="shrink-0">
                Most-used words in submitted reflections (deterministic frequency, no AI).
              </FieldInfoHint>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {wordCloudData.map((w) => {
                const max = wordCloudData[0].count;
                const scale = 0.85 + (w.count / max) * 0.6;
                return (
                  <span
                    key={w.word}
                    className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-1 text-[color:var(--foreground)]"
                    style={{ fontSize: `${scale}rem` }}
                  >
                    {w.word}
                    <span className="text-[10px] text-muted-foreground tabular-nums">×{w.count}</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
