import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNextPath } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeAuthNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");

  if (code && !url.searchParams.has("error")) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(new URL(next, url.origin));
        response.headers.set("Cache-Control", "no-store");
        return response;
      }
    } catch {
      // Do not expose provider details or authorization codes in the URL.
    }
  }

  const login = new URL("/auth/login", url.origin);
  login.searchParams.set("error", "google_sign_in_failed");
  login.searchParams.set("next", next);
  const response = NextResponse.redirect(login);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
