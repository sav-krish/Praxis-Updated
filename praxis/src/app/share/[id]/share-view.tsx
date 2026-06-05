"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldInfoHint } from "@/components/ui/field-info-hint";
import { copySimulationToAccount } from "@/app/(dashboard)/share/[id]/actions";
import {
  BookOpen,
  Share2,
  Copy,
  Loader2,
  Check,
  ArrowLeft,
  LogIn,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

interface ShareViewProps {
  simulationId: string;
  title: string;
  courseTopic: string;
  isOwner: boolean;
  isAuthenticated: boolean;
  shareUrl: string;
}

export function ShareView({
  simulationId,
  title,
  courseTopic,
  isOwner,
  isAuthenticated,
  shareUrl: initialShareUrl,
}: ShareViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [copying, setCopying] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${simulationId}`
      : initialShareUrl || `${simulationId}`;
  const authReturnTo = pathname || `/share/${simulationId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success("Instructor copy link copied");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleCopyToAccount = async () => {
    setCopying(true);
    const result = await copySimulationToAccount(simulationId);
    setCopying(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Simulation copied to your account");
    router.push(`/edit/${result.newId}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <Share2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">Instructor Copy Link</span>
          <FieldInfoHint className="h-7 w-7 text-muted-foreground hover:text-foreground">
            This page is for instructors sharing simulations with other instructors.
            Students should use a join code, student join link, or QR code from a live session.
          </FieldInfoHint>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="space-y-2">
          {isOwner ? (
            <p className="text-sm">
              Send this page to another instructor so they can copy this simulation into their own Praxis account.
            </p>
          ) : (
            <p className="text-sm">
              Save this simulation to your Praxis account to edit and run it with your students.
            </p>
          )}
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {courseTopic}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOwner ? (
          <>
            <div className="space-y-2">
              <div className="rounded-md border bg-muted/50 p-2 font-mono text-xs break-all">
                {shareUrl}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="w-fit">
                {copiedLink ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copiedLink ? "Copied" : "Copy Instructor Link"}
              </Button>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              This is the same page your recipient will open. They will be able to copy the simulation into their own account from here.
            </div>
            <Link href={`/edit/${simulationId}`}>
              <Button className="w-full min-h-[44px]">
                <BookOpen className="mr-2 h-4 w-4" />
                Return to Editor
              </Button>
            </Link>
          </>
        ) : isAuthenticated ? (
          <Button
            className="w-full min-h-[48px]"
            onClick={handleCopyToAccount}
            disabled={copying}
          >
            {copying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copying ? "Copying…" : "Copy Simulation to My Account"}
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to copy this simulation into your own Praxis workspace.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/auth/login?next=${encodeURIComponent(authReturnTo)}`}
                className="flex-1"
              >
                <Button className="w-full min-h-[44px]">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In to Copy
                </Button>
              </Link>
              <Link
                href={`/auth/signup?next=${encodeURIComponent(authReturnTo)}`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full min-h-[44px]">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        )}

        <Link href="/" className="block">
          <Button variant="ghost" className="w-full min-h-[44px]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
