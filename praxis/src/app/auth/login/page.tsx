"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Moon } from "lucide-react";
import { toast } from "sonner";

// Theme toggle for auth pages
function AuthThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="fixed top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-[#33302c] border border-line dark:border-[#44403b] shadow-sm hover:shadow-md transition-shadow"
      title="Toggle color theme"
      aria-label="Toggle color theme"
    >
      <Moon className="h-5 w-5 text-[#4a1f10] dark:text-[#f0eee6]" strokeWidth={2.4} />
    </button>
  );
}

export default function LoginPage() {
  return (
    <>
      <AuthThemeToggle />
      <LoginForm />
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const next = searchParams.get("next");
  const nextPath = next?.startsWith("/") ? next : "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    router.push(nextPath);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 dark:bg-[#292724] px-4 py-6">
      <Card className="w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-auto border-[#e8b995] bg-white text-[#4a1f10] dark:border-[#524c46] dark:bg-[#33302c] dark:text-[#f0eee6]">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-white p-0.5">
              <Image
                src="/new_logo.png"
                alt="Praxis"
                width={420}
                height={109}
                className="h-14 w-auto sm:h-16"
                priority
              />
            </span>
          </Link>
          <CardTitle className="text-[#4a1f10] dark:text-[#f0eee6]">Welcome back</CardTitle>
          <CardDescription className="text-[#6f3e27] dark:text-[#d5d0c8]">
            Sign in to your account to manage your simulations
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pb-3">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#4a1f10] dark:text-[#f0eee6]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#4a1f10] dark:text-[#f0eee6]">Password</Label>
                <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#a93d07] underline-offset-4 hover:underline dark:text-[#ffad66]">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-0">
            <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
            <p className="text-center text-sm text-[#6f3e27] dark:text-[#d5d0c8]">
              Don't have an account?{" "}
              <Link
                href={`/auth/signup${next ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
                className="font-semibold text-[#a93d07] underline-offset-4 hover:underline dark:text-[#ffad66]"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
