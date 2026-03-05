import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { AdminEmailsView } from "./admin-emails-view";
import { isResendConfigured } from "@/lib/email/resend-service";

export default async function AdminEmailsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = await isAdmin(user ?? null);
  if (!admin) {
    redirect("/dashboard");
  }

  const resendReady = isResendConfigured();

  return <AdminEmailsView resendReady={resendReady} />;
}
