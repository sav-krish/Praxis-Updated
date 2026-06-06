import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { code } = await params;
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, simulation_id, status")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!session || session.status === "complete") {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      session_id: session.id,
      name,
      is_voter: true,
    })
    .select("id, name")
    .single();

  if (error || !participant) {
    return NextResponse.json({ error: "Failed to join session" }, { status: 500 });
  }

  const { data: profiles } = await supabase
    .from("simulation_profiles")
    .select("id")
    .eq("simulation_id", session.simulation_id)
    .order("order_num", { ascending: true });

  if (profiles && profiles.length > 0) {
    const { data: sessionParticipants } = await supabase
      .from("participants")
      .select("id")
      .eq("session_id", session.id)
      .order("joined_at", { ascending: true });

    const joinedIndex = sessionParticipants?.findIndex((p) => p.id === participant.id) ?? -1;
    if (joinedIndex >= 0) {
      const profileId = profiles[joinedIndex % profiles.length]?.id;
      if (profileId) {
        await supabase
          .from("participants")
          .update({ profile_id: profileId })
          .eq("id", participant.id);
      }
    }
  }

  return NextResponse.json({
    sessionId: session.id,
    simulationId: session.simulation_id,
    participantId: participant.id,
    participantName: participant.name,
  });
}
