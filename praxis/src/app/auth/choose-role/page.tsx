"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen } from "lucide-react";
import { LandingBackground } from "@/components/landing/landing-background";

function ChooseRoleContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const nextQuery = next?.startsWith("/") ? `&next=${encodeURIComponent(next)}` : "";

  return (
    <div className="relative isolate min-h-screen text-ink">
      <LandingBackground />
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg border-border/80 bg-white/95 shadow-soft">
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
            <CardTitle className="text-2xl text-ink">How will you use Praxis?</CardTitle>
            <CardDescription>
              Choose your role to get the right dashboard and signup experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/auth/signup?role=professor${nextQuery}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 transition hover:border-accent hover:bg-accentSoft/40"
            >
              <GraduationCap className="h-10 w-10 text-accent" />
              <div className="text-center">
                <p className="font-semibold text-ink">I&apos;m a Professor</p>
                <p className="mt-1 text-xs text-muted-text">
                  Create and run classroom simulations
                </p>
              </div>
            </Link>
            <Link
              href={`/auth/signup?role=student${nextQuery}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 transition hover:border-accent hover:bg-accentSoft/40"
            >
              <BookOpen className="h-10 w-10 text-accent" />
              <div className="text-center">
                <p className="font-semibold text-ink">I&apos;m a Student</p>
                <p className="mt-1 text-xs text-muted-text">
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
                className="text-accent hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Joining a class session without an account?{" "}
              <Link href="/join" className="text-accent hover:underline font-medium">
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
