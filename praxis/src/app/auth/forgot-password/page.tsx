"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PraxisLogo } from "@/components/praxis-logo";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setSent(true);
      toast.success("Password reset code sent!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <PraxisLogo className="h-12 w-auto" />
          </div>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Enter your email to receive a password reset code</CardDescription>
        </CardHeader>

        {!sent ? (
          <>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Code
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <Link href="/auth/login" className="text-xs text-primary hover:underline flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </Link>
            </CardFooter>
          </>
        ) : (
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="text-lg font-semibold text-green-600">Code Sent!</div>
              <p className="text-sm text-gray-600">
                We&apos;ve sent a password reset code to <span className="font-medium">{email}</span>
              </p>
              <p className="text-xs text-gray-500">Enter that code on the next screen to choose a new password.</p>
              <Button
                className="w-full"
                onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`)}
              >
                Enter Reset Code
              </Button>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
              >
                Send Another Email
              </Button>
              <Link
                href="/auth/login"
                className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
