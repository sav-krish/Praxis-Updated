import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { sendAdminEmail } from "@/lib/email/resend-service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = await isAdmin(user ?? null);
  if (!admin || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { subject, message, from } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: "Missing subject or message" }, { status: 400 });
  }

  const adminEmail = user.email;
  if (!adminEmail) {
    return NextResponse.json({ error: "Admin email not found" }, { status: 400 });
  }

  const adminName = (user.user_metadata?.name as string) ?? "Admin";
  const personalizedMessage = message
    .replace(/\{name\}/g, adminName)
    .replace(/\n/g, "<br>");

  const success = await sendAdminEmail({
    email: adminEmail,
    name: adminName,
    subject: `[TEST] ${subject}`,
    html: personalizedMessage,
    from: from || undefined,
  });

  if (success) {
    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      recipientEmail: adminEmail,
    });
  }

  return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
}
