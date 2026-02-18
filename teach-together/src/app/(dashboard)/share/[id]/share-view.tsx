"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { copySimulationToAccount } from "./actions";
import { BookOpen, Share2, Copy, Loader2, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ShareViewProps {
  simulationId: string;
  title: string;
  courseTopic: string;
  isOwner: boolean;
  shareUrl: string;
}

export function ShareView({ simulationId, title, courseTopic, isOwner, shareUrl: initialShareUrl }: ShareViewProps) {
  const router = useRouter();
  const [copying, setCopying] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${simulationId}`
      : initialShareUrl || `${simulationId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success("Link copied to clipboard");
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
        <div className="flex items-center gap-2 text-muted-foreground">
          <Share2 className="h-5 w-5" />
          <span className="text-sm font-medium">Share simulation</span>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {courseTopic}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isOwner ? (
          <>
            <p className="text-sm text-muted-foreground">
              This is your simulation. Share the link below so other instructors can copy it to their account and adapt it.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex rounded-md border bg-muted/50 p-2 font-mono text-xs break-all">
                {shareUrl}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="w-fit">
                {copiedLink ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copiedLink ? "Copied" : "Copy link"}
              </Button>
            </div>
            <Link href={`/edit/${simulationId}`}>
              <Button variant="secondary" className="w-full min-h-[44px]">
                <BookOpen className="h-4 w-4 mr-2" />
                Edit this simulation
              </Button>
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Copy this simulation to your account to edit and run it with your students.
            </p>
            <Button
              className="w-full min-h-[48px]"
              onClick={handleCopyToAccount}
              disabled={copying}
            >
              {copying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copying ? "Copying…" : "Copy to my account"}
            </Button>
          </>
        )}
        <Link href="/dashboard" className="block">
          <Button variant="ghost" className="w-full min-h-[44px]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
