import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { sendAdminEmail } from "@/lib/email/resend-service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = await isAdmin(user ?? null);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    subject,
    message,
    from,
    recipientFilter,
    customEmails = [],
    excludedEmails = [],
  } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
  }

  let adminSupabase;
  try {
    adminSupabase = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY not configured. Add one to .env.local." },
      { status: 500 }
    );
  }

  let recipients: { email: string; name: string | null }[] = [];

  if (recipientFilter === "custom") {
    if (customEmails.length === 0) {
      return NextResponse.json(
        { error: "No recipients selected for custom email" },
        { status: 400 }
      );
    }
    const { data: professors } = await adminSupabase
      .from("professors")
      .select("email, name")
      .in("email", customEmails);
    recipients = (professors ?? []).map((p) => ({
      email: p.email,
      name: p.name ?? null,
    }));
  } else {
    const { data: professors } = await adminSupabase
      .from("professors")
      .select("email, name");
    const all = (professors ?? []).map((p) => ({
      email: p.email,
      name: p.name ?? null,
    }));
    recipients = all.filter((r) => !excludedEmails.includes(r.email));
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients found for the selected filter" },
      { status: 400 }
    );
  }

  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  for (const recipient of recipients) {
    const personalizedMessage = message
      .replace(/\{name\}/g, recipient.name || "there")
      .replace(/\n/g, "<br>");

    const success = await sendAdminEmail({
      email: recipient.email,
      name: recipient.name,
      subject,
      html: personalizedMessage,
      from: from || undefined,
    });

    if (success) {
      successCount++;
    } else {
      failureCount++;
      errors.push(`Failed to send to ${recipient.email}`);
    }
  }

  return NextResponse.json({
    success: true,
    recipientCount: recipients.length,
    successCount,
    failureCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
