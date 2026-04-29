"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[auth error]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-3">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle>Authentication Error</CardTitle>
          <CardDescription>
            {error.message || "Something went wrong. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={reset} variant="outline" className="min-h-[44px]">
            Try again
          </Button>
          <Link href="/login">
            <Button variant="ghost" className="w-full min-h-[44px]">
              Back to login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
