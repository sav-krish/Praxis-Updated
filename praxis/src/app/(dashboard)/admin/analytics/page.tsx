import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { buildAdminAnalyticsViewData } from "@/lib/admin-analytics";
import { AdminAnalyticsLazy } from "./admin-analytics-lazy";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await isAdmin(user ?? null))) {
    redirect("/dashboard");
  }

  let svc: ReturnType<typeof createServiceRoleClient>;
  try {
    svc = createServiceRoleClient();
  } catch {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Set <code className="text-xs bg-muted px-1 rounded">SUPABASE_SECRET_KEY</code> or{" "}
          <code className="text-xs bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in the environment to load
          cross-tenant analytics.
        </p>
      </div>
    );
  }

  let data;
  try {
    data = await buildAdminAnalyticsViewData(svc);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load analytics.";
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground text-sm whitespace-pre-wrap">{message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>
      <AdminAnalyticsLazy data={data} />
    </div>
  );
}
