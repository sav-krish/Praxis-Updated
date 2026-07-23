"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { LandingBackground } from "@/components/landing/landing-background";

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

function ChooseRoleContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const nextQuery = next?.startsWith("/") ? `&next=${encodeURIComponent(next)}` : "";

  return (
    <div className="relative isolate min-h-screen" data-landing="true">
      <AuthThemeToggle />
      <LandingBackground />
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg border-border/80 bg-white/95 dark:bg-[#33302c] shadow-soft">
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center justify-center mb-4">
              <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-white p-0.5">
                <Image
                  src="/new_logo.png"
                  alt="Praxis"
                  width={280}
                  height={73}
                  className="h-14 w-auto sm:h-16"
                  priority
                />
              </span>
            </Link>
            <CardTitle className="text-2xl text-[#4a1f10] dark:text-[#f0eee6]">How will you use Praxis?</CardTitle>
            <CardDescription className="text-[#6f3e27] dark:text-[#d5d0c8]">
              Choose your role to get the right dashboard and signup experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/auth/signup?role=professor${nextQuery}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-[#e8b995] p-6 transition hover:border-[#c94f0a] hover:bg-[#fff0e4] dark:border-[#625b54] dark:hover:border-[#ffad66] dark:hover:bg-[#403b37]"
            >
              <GraduationCap className="h-10 w-10 text-[#b6430a] dark:text-[#ffad66]" strokeWidth={2.25} />
              <div className="text-center">
                <p className="font-semibold text-[#4a1f10] dark:text-[#f0eee6]">I'm a Professor</p>
                <p className="mt-1 text-xs text-[#6f3e27] dark:text-[#d5d0c8]">
                  Create and run classroom simulations
                </p>
              </div>
            </Link>
            <Link
              href={`/auth/signup?role=student${nextQuery}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-[#e8b995] p-6 transition hover:border-[#c94f0a] hover:bg-[#fff0e4] dark:border-[#625b54] dark:hover:border-[#ffad66] dark:hover:bg-[#403b37]"
            >
              <BookOpen className="h-10 w-10 text-[#b6430a] dark:text-[#ffad66]" strokeWidth={2.25} />
              <div className="text-center">
                <p className="font-semibold text-[#4a1f10] dark:text-[#f0eee6]">I'm a Student</p>
                <p className="mt-1 text-xs text-[#6f3e27] dark:text-[#d5d0c8]">
                  Join sessions and practice in Explore
                </p>
              </div>
            </Link>
          </CardContent>
          <CardContent className="pt-0 text-center">
            <p className="text-sm text-[#6f3e27] dark:text-[#d5d0c8]">
              Already have an account?{" "}
              <Link
                href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="font-semibold text-[#a93d07] underline-offset-4 hover:underline dark:text-[#ffad66]"
              >
                Sign in
              </Link>
            </p>
            <p className="mt-3 text-sm text-[#6f3e27] dark:text-[#d5d0c8]">
              Joining a class session without an account?{" "}
              <Link href="/join" className="font-semibold text-[#a93d07] underline-offset-4 hover:underline dark:text-[#ffad66]">
                Enter a join code
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ChooseRolePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <ChooseRoleContent />
    </Suspense>
  );
}
