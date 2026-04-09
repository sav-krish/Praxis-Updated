import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { buildAdminAnalyticsPayload } from "@/lib/admin-analytics";
import { analyticsInsightDailyLimiter } from "@/lib/rate-limit-daily";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEFAULT_ANALYTICS_GOALS = `- Professors adopt Praxis to run interactive, decision-based classroom simulations.
- Students join live sessions and submit decisions (responses) during runs.
- The public library helps discovery; favorites and curated pins signal valuable content.
- Paying or trialing subscriptions indicate willingness to use the product beyond free tiers.`;

const ANALYST_SYSTEM_PROMPT = `You are an analyst helping a non-technical founder understand Praxis admin analytics.

Praxis is a platform for higher education: professors build interactive decision simulations; students join sessions with a code and submit choices; there is a public simulation library.

Rules:
- Output plain language and markdown sections only. Do NOT use [ACTION] blocks or JSON patches.
- You only have aggregate counts and top lists — not revenue, NPS, support tickets, or cohort retention. Say so when relevant.
- Start with one line: **Evaluating against:** then a very short paraphrase of the product goals provided.
- Then use these sections with ## headings: Summary, What's working, What to watch, Suggested focus.
- In each section, tie observations to the stated product goals where it makes sense.
- If numbers are zero or very low, say that clearly without alarmism; suggest what to validate next.
- Be concise. No more than ~12 short bullets total across the doc.`;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isAdmin(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (analyticsInsightDailyLimiter.isExceeded(user.id)) {
    return NextResponse.json({ error: "Daily limit reached for insights. Try again tomorrow." }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI is not configured." }, { status: 503 });
  }

  let svc: ReturnType<typeof createServiceRoleClient>;
  try {
    svc = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Service role key missing; cannot load analytics." }, { status: 503 });
  }

  let payload;
  try {
    payload = await buildAdminAnalyticsPayload(svc);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const goals =
    (process.env.PRAXIS_ANALYTICS_GOALS ?? "").trim() || DEFAULT_ANALYTICS_GOALS;

  const userMessage = `Product goals (evaluate insights against these):\n${goals}\n\nAnalytics payload (JSON):\n${JSON.stringify(payload)}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o",
    messages: [
      { role: "system", content: ANALYST_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 1200,
    stream: false,
  });

  const insight = completion.choices[0]?.message?.content?.trim();
  if (!insight) {
    return NextResponse.json({ error: "Empty model response." }, { status: 502 });
  }

  analyticsInsightDailyLimiter.recordSuccess(user.id);

  return NextResponse.json({ insight });
}
