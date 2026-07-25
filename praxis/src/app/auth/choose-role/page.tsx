"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen } from "lucide-react";
import { LandingBackground } from "@/components/landing/landing-background";
import { PraxisLogo } from "@/components/praxis-logo";

function ChooseRoleContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const nextQuery = next?.startsWith("/") ? `&next=${encodeURIComponent(next)}` : "";

  return (
    <div className="relative isolate min-h-screen bg-background text-foreground">
      <LandingBackground />
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg border-border bg-card text-card-foreground shadow-soft">
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center justify-center mb-4">
              <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-white p-0.5 dark:bg-transparent">
                <PraxisLogo className="h-14 w-auto sm:h-16" priority />
              </span>
            </Link>
            <CardTitle className="text-2xl text-foreground">How will you use Praxis?</CardTitle>
            <CardDescription className="text-muted-foreground">
              Choose your role to get the right dashboard and signup experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/auth/signup?role=professor${nextQuery}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-background/40 p-6 text-foreground transition hover:border-primary hover:bg-accent"
            >
              <GraduationCap className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">I&apos;m a Professor</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create and run classroom simulations
                </p>
              </div>
            </Link>
            <Link
              href={`/auth/signup?role=student${nextQuery}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-background/40 p-6 text-foreground transition hover:border-primary hover:bg-accent"
            >
              <BookOpen className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">I&apos;m a Student</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Join sessions and practice in Explore
                </p>
              </div>
            </Link>
          </CardContent>
          <CardContent className="pt-0 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href={`/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Joining a class session without an account?{" "}
              <Link href="/join" className="font-medium text-primary hover:underline">
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
