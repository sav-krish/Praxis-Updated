import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { streamJsonText } from "@/lib/gemini-generate";
import { getModel } from "@/lib/gemini-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE-streamed facilitator debrief.
 *
 * Events:
 *   `cached`             — debrief already saved on the session; full payload returned in one shot.
 *   `field` { name }     — about to start a field (`correctCourseOfAction`, etc.).
 *   `field-done` { name, value }  — final value for the named field.
 *   `done` { debrief }   — full debrief, also persisted to `sessions.debrief_guide`.
 *   `error` { message }  — fatal error.
 */

const DebriefSchema = z.object({
  correctCourseOfAction: z.string(),
  keyDiscussionPoints: z.array(z.string()).min(2).max(6),
  commonMistakes: z.array(z.string()).min(2).max(4),
  connectionToObjectives: z.string(),
  facilitatorTips: z.array(z.string()).min(2).max(5),
});

type Debrief = z.infer<typeof DebriefSchema>;

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const { sessionId } = (await request.json()) as { sessionId?: string };
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "sessionId is required" }), { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, simulation_id, debrief_guide")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(sse(event, data)));

      try {
        if (session.debrief_guide) {
          send("cached", { debrief: session.debrief_guide });
          send("done", { debrief: session.debrief_guide });
          controller.close();
          return;
        }

        const { data: simulation } = await supabase
          .from("simulations")
          .select("title, course_topic, goal, target_decisions, background_content")
          .eq("id", session.simulation_id)
          .single();

        if (!simulation) {
          send("error", { message: "Simulation not found" });
          controller.close();
          return;
        }

        const { data: decisions } = await supabase
          .from("decisions")
          .select("id, order_num, prompt, options(label, title, description, consequence, score)")
          .eq("simulation_id", session.simulation_id)
          .order("order_num", { ascending: true });

        const { data: responses } = await supabase
          .from("responses")
          .select("decision_id, option_id")
          .eq("session_id", sessionId);

        const decisionSummaries = (decisions || []).map((d) => {
          const opts = (d.options as unknown as { label: string; title: string; score: number }[]) || [];
          const decResponses = (responses || []).filter((r) => r.decision_id === d.id);
          const optimal = opts.find((o) => o.score === 3);
          return {
            decision: d.order_num,
            prompt: d.prompt,
            options: opts.map((o) => `${o.label}: ${o.title} (score: ${o.score})`).join("; "),
            optimal: optimal ? `${optimal.label}: ${optimal.title}` : "N/A",
            responseCount: decResponses.length,
          };
        });

        const system =
          "You are an expert classroom facilitator. Generate a concise, actionable debrief guide. Use specific, decision-aware language; cite Decision 1/2/3 by number when relevant.";
        const user = `Generate a facilitator debrief guide for this simulation.

**Title:** ${simulation.title}
**Topic:** ${simulation.course_topic}
**Learning Goal:** ${simulation.goal || "Not specified"}
**Target Decisions:** ${simulation.target_decisions || "Not specified"}

**Background (truncated):**
${(simulation.background_content || "").slice(0, 2000)}

**Decisions and observed responses:**
${decisionSummaries
  .map(
    (d) =>
      `Decision ${d.decision}: ${d.prompt}\nOptions: ${d.options}\nOptimal: ${d.optimal}\nResponses: ${d.responseCount}`,
  )
  .join("\n\n")}`;

        let buffer = "";
        const fieldOrder: (keyof Debrief)[] = [
          "correctCourseOfAction",
          "keyDiscussionPoints",
          "commonMistakes",
          "connectionToObjectives",
          "facilitatorTips",
        ];
        const announced = new Set<string>();

        await streamJsonText({
          system,
          user,
          model: getModel(),
          temperature: 0.5,
          onDelta: (delta) => {
            buffer += delta;
            for (const f of fieldOrder) {
              if (announced.has(f)) continue;
              const idx = buffer.indexOf(`"${f}"`);
              if (idx !== -1) {
                announced.add(f);
                send("field", { name: f });
              }
            }
          },
        });

        // Validate + persist the final structured payload.
        let parsed: Debrief | null = null;
        try {
          // Strip any leading/trailing whitespace
          const trimmed = buffer.trim();
          parsed = DebriefSchema.parse(JSON.parse(trimmed));
        } catch (e) {
          send("error", {
            message: e instanceof Error ? e.message : "Failed to parse debrief JSON",
          });
          controller.close();
          return;
        }

        for (const f of fieldOrder) {
          send("field-done", { name: f, value: parsed[f] });
        }

        await supabase
          .from("sessions")
          .update({ debrief_guide: parsed })
          .eq("id", sessionId);

        send("done", { debrief: parsed });
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Failed to generate debrief",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
