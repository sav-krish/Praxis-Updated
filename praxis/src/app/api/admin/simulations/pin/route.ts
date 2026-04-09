import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

const bodySchema = z.object({
  simulationId: z.string().uuid(),
  pinned: z.boolean(),
  pinnedOrder: z.number().int().min(0).max(9999).optional(),
});

/**
 * Set or clear library flagship pin. Requires admin session + service role key.
 * Only simulations with is_public = true may be pinned.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await isAdmin(user ?? null))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { simulationId, pinned, pinnedOrder } = parsed.data;

  let adminSupabase: ReturnType<typeof createServiceRoleClient>;
  try {
    adminSupabase = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY not configured. Add one to .env.local.",
      },
      { status: 503 }
    );
  }

  const { data: row, error: fetchError } = await adminSupabase
    .from("simulations")
    .select("id, is_public")
    .eq("id", simulationId)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  }

  if (!row.is_public) {
    return NextResponse.json(
      { error: "Only public library simulations can be pinned. Publish the simulation first." },
      { status: 400 }
    );
  }

  const { error: updateError } = await adminSupabase
    .from("simulations")
    .update({
      is_pinned: pinned,
      pinned_order: pinned ? (pinnedOrder ?? 0) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", simulationId);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: "Failed to update pin" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
