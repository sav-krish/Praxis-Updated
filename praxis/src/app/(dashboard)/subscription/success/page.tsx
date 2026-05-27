import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
      <h1 className="text-2xl font-semibold mb-2">Thank you for subscribing</h1>
      <p className="text-muted-foreground text-center mb-6">
        Your subscription is now active. You have full access to all features.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
