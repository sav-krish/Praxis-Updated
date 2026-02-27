import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient, getModel } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if debrief already exists
    const { data: session } = await supabase
      .from("sessions")
      .select("id, simulation_id, debrief_guide")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.debrief_guide) {
      return NextResponse.json({ success: true, debrief: session.debrief_guide });
    }

    // Fetch simulation details
    const { data: simulation } = await supabase
      .from("simulations")
      .select("title, course_topic, goal, target_decisions, background_content")
      .eq("id", session.simulation_id)
      .single();

    if (!simulation) {
      return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
    }

    // Fetch decisions with options (include id for response matching)
    const { data: decisions } = await supabase
      .from("decisions")
      .select("id, order_num, prompt, options(label, title, description, consequence, score)")
      .eq("simulation_id", session.simulation_id)
      .order("order_num", { ascending: true });

    // Fetch response distribution
    const { data: responses } = await supabase
      .from("responses")
      .select("decision_id, option_id")
      .eq("session_id", sessionId);

    const totalParticipants = responses ? new Set(responses.map(r => r.option_id)).size : 0;

    const decisionSummaries = (decisions || []).map((d) => {
      const opts = (d.options as unknown as { label: string; title: string; score: number }[]) || [];
      const decResponses = (responses || []).filter((r) => r.decision_id === d.id);
      const optimalOption = opts.find((o) => o.score === 3);
      return {
        decision: d.order_num,
        prompt: d.prompt,
        options: opts.map((o) => `${o.label}: ${o.title} (score: ${o.score})`).join("; "),
        optimal: optimalOption ? `${optimalOption.label}: ${optimalOption.title}` : "N/A",
        responseCount: decResponses.length,
      };
    });

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: "system",
          content: `You are an expert facilitator helping instructors debrief a classroom simulation. Generate a concise, actionable facilitator guide in JSON format.`,
        },
        {
          role: "user",
          content: `Generate a facilitator debrief guide for this simulation:

**Title:** ${simulation.title}
**Topic:** ${simulation.course_topic}
**Learning Goal:** ${simulation.goal || "Not specified"}
**Target Decisions:** ${simulation.target_decisions || "Not specified"}

**Background (summary):**
${(simulation.background_content || "").slice(0, 2000)}

**Decisions:**
**Total responses collected:** ${totalParticipants}

${decisionSummaries.map((d) => `Decision ${d.decision}: ${d.prompt}\nOptions: ${d.options}\nOptimal: ${d.optimal}\nResponses for this decision: ${d.responseCount}`).join("\n\n")}

Return a JSON object with:
{
  "correctCourseOfAction": "A paragraph explaining the ideal path through all 3 decisions and why",
  "keyDiscussionPoints": ["3-5 questions or topics to raise during debrief"],
  "commonMistakes": ["2-3 common student errors and how to address them"],
  "connectionToObjectives": "How the simulation connects to the learning goal",
  "facilitatorTips": ["2-3 practical tips for leading the debrief discussion"]
}`,
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: "No content from AI" }, { status: 500 });
    }

    const debrief = JSON.parse(content);

    // Save to session
    await supabase
      .from("sessions")
      .update({ debrief_guide: debrief })
      .eq("id", sessionId);

    return NextResponse.json({ success: true, debrief });
  } catch (error) {
    console.error("[generate-debrief] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate debrief" },
      { status: 500 }
    );
  }
}
