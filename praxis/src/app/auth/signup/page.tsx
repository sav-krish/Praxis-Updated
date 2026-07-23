"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const CAREER_INTERESTS = [
  "Consulting",
  "Entrepreneurship",
  "Product Management",
  "Policy",
  "Finance",
  "Marketing",
];

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const isStudent = roleParam === "student";
  const next = searchParams.get("next");
  const joinCode = searchParams.get("code");
  const nextPath = next?.startsWith("/") ? next : "/dashboard";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [major, setMajor] = useState("");
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleCareerInterest = (interest: string) => {
    setCareerInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const metadata = isStudent
      ? {
          role: "student",
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          school: school.trim(),
          graduation_year: graduationYear,
          major: major.trim() || null,
          career_interests: careerInterests,
        }
      : {
          role: "professor",
          name: name.trim(),
        };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! You can now sign in.");
    const loginNext = joinCode
      ? `/join?code=${encodeURIComponent(joinCode)}`
      : nextPath;
    router.push(data.session ? loginNext : `/auth/login${joinCode ? `?next=${encodeURIComponent(loginNext)}` : next ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
    router.refresh();
  };

  if (roleParam && roleParam !== "student" && roleParam !== "professor") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Choose your role</CardTitle>
            <CardDescription>Select whether you are signing up as a student or professor.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full min-h-[48px]">
              <Link href="/auth/choose-role">Continue</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!roleParam) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Choose your role</CardTitle>
            <CardDescription>We need to know if you are a student or professor before creating your account.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full min-h-[48px]">
              <Link href={`/auth/choose-role${next ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>
                Continue
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-6">
      <Card className="w-full max-w-md max-h-[calc(100dvh-3rem)] overflow-auto">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
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
          <CardTitle>
            {isStudent ? "Create your student account" : "Create your professor account"}
          </CardTitle>
          <CardDescription>
            {isStudent
              ? "Practice simulations, track your score, and review decision feedback."
              : "Start creating engaging classroom simulations."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {isStudent ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">School</Label>
                  <Input
                    id="school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="University of Texas at Austin"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="graduationYear">Graduation year</Label>
                  <Input
                    id="graduationYear"
                    type="number"
                    min={2000}
                    max={2100}
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">Major (optional)</Label>
                  <Input
                    id="major"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Career interests (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Select the career paths you're most interested in.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CAREER_INTERESTS.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleCareerInterest(interest)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors border ${
                          careerInterests.includes(interest)
                            ? "bg-accent text-white border-accent"
                            : "bg-white text-ink border-line hover:bg-accentSoft"
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 pb-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button type="submit" className="w-full min-h-[48px] mb-2" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link
                href={`/auth/login${next ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
                className="text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/auth/choose-role" className="text-primary hover:underline">
                Choose a different role
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}