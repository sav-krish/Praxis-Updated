import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = await isAdmin(user ?? null);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role to bypass RLS and fetch all professors (requires SUPABASE_SERVICE_ROLE_KEY)
  let adminSupabase;
  try {
    adminSupabase = createServiceRoleClient();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Service role not configured";
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY not configured. Add one to .env.local to list all professors.", detail: msg },
      { status: 500 }
    );
  }
  const { data: professors, error } = await adminSupabase
    .from("professors")
    .select("id, email, name")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching professors:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipients", detail: error.message },
      { status: 500 }
    );
  }

  const recipients = (professors ?? []).map((p) => ({
    email: p.email,
    name: p.name ?? null,
    id: p.id,
  }));

  return NextResponse.json({
    data: recipients,
    counts: {
      total: recipients.length,
    },
  });
}
