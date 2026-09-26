"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { safeAuthNextPath } from "@/lib/auth-utils";

export function GoogleSignInButton({ next, disabled = false }: { next?: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    try {
      const settingsResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
        cache: "no-store",
      });
      if (!settingsResponse.ok) throw new Error("Unable to check sign-in availability");
      const settings = await settingsResponse.json();
      if (!settings.external?.google) {
        toast.error("Google sign-in is being set up. Please use email to sign in for now.");
        setLoading(false);
        return;
      }
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", safeAuthNextPath(next));
      const { data, error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
      });
      if (error || !data.url) throw error ?? new Error("Missing sign-in URL");
      window.location.assign(data.url);
    } catch {
      toast.error("Google sign-in is unavailable right now. Please try again or sign in with email.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" className="w-full min-h-[48px]" disabled={disabled || loading} onClick={signIn}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 h-5 w-5">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z" />
            <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z" />
          </svg>
        )}
        {loading ? "Connecting to Google…" : "Continue with Google"}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />or continue with email<span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
