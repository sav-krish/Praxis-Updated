import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ code: string }>;
}

async function getStudentScope(
  code: string,
  participantId: string,
  userId: string,
) {
  const adminSupabase = createServiceRoleClient();
  const { data: session } = await adminSupabase
    .from("sessions")
    .select("id, simulation_id")
    .eq("join_code", code.toUpperCase())
    .single();

  if (!session) return null;

  const { data: participant } = await adminSupabase
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .eq("session_id", session.id)
    .eq("user_id", userId)
    .maybeSingle();

  return participant ? session : null;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const participantId = request.nextUrl.searchParams.get("participantId")?.trim();
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !participantId) {
    return NextResponse.json({ persistent: false });
  }

  const { data: account } = await supabase
    .from("professors")
    .select("active_role")
    .eq("id", user.id)
    .maybeSingle();

  // Professors can participate in a session, but that must not create a
  // student profile or turn their account into student mode.
  if (account?.active_role !== "student") {
    return NextResponse.json({ persistent: false });
  }

  const scope = await getStudentScope(code, participantId, user.id);
  if (!scope) {
    return NextResponse.json({ error: "Student session not found" }, { status: 404 });
  }

  const [{ data: profile }, { data: simulationOnboarding }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("student_skip_onboarding_globally")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("student_simulation_onboarding")
      .select("student_onboarding_seen")
      .eq("student_id", user.id)
      .eq("simulation_id", scope.simulation_id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    persistent: true,
    studentOnboardingSeen:
      simulationOnboarding?.student_onboarding_seen === true,
    studentSkipOnboardingGlobally:
      profile?.student_skip_onboarding_globally === true,
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const body = (await request.json().catch(() => null)) as
    | {
        participantId?: string;
        studentOnboardingSeen?: boolean;
        studentSkipOnboardingGlobally?: boolean;
      }
    | null;
  const participantId = body?.participantId?.trim();
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !participantId) {
    return NextResponse.json({ error: "Sign in is required" }, { status: 401 });
  }

  const { data: account } = await supabase
    .from("professors")
    .select("active_role")
    .eq("id", user.id)
    .maybeSingle();

  // Keep onboarding local for non-student participants. In particular, do
  // not upsert a `student_profiles` row for a professor who is testing or
  // joining a class session.
  if (account?.active_role !== "student") {
    return NextResponse.json({ persistent: false });
  }

  if (
    body?.studentOnboardingSeen !== true &&
    body?.studentSkipOnboardingGlobally !== true
  ) {
    return NextResponse.json({ error: "No onboarding state to save" }, { status: 400 });
  }

  const scope = await getStudentScope(code, participantId, user.id);
  if (!scope) {
    return NextResponse.json({ error: "Student session not found" }, { status: 404 });
  }

  if (body.studentOnboardingSeen) {
    const { error } = await supabase
      .from("student_simulation_onboarding")
      .upsert(
        {
          student_id: user.id,
          simulation_id: scope.simulation_id,
          student_onboarding_seen: true,
        },
        { onConflict: "student_id,simulation_id" },
      );
    if (error) {
      return NextResponse.json({ error: "Could not save onboarding state" }, { status: 500 });
    }
  }

  if (body.studentSkipOnboardingGlobally) {
    const { error } = await supabase.from("student_profiles").upsert(
      {
        user_id: user.id,
        student_skip_onboarding_globally: true,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      return NextResponse.json({ error: "Could not save onboarding preference" }, { status: 500 });
    }
  }

  return NextResponse.json({
    persistent: true,
    studentOnboardingSeen: body.studentOnboardingSeen === true,
    studentSkipOnboardingGlobally:
      body.studentSkipOnboardingGlobally === true,
  });
}
