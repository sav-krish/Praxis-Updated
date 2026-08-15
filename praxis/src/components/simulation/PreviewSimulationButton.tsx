"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPreviewSession } from "@/app/(dashboard)/session/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PreviewSimulationButtonProps {
  simulationId: string;
  variant?: "default" | "outline" | "ghost" | "link" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  asDropdownItem?: boolean;
}

export function PreviewSimulationButton({
  simulationId,
  variant = "outline",
  size = "sm",
  className = "",
  children,
  asDropdownItem = false,
}: PreviewSimulationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    const result = await createPreviewSession(simulationId);
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem(`participant_${result.sessionId}`, result.participantId);
      sessionStorage.setItem(`participant_name_${result.sessionId}`, result.participantName);
      sessionStorage.setItem(`participant_owner_${result.sessionId}`, result.participantUserId);
    }
    router.push(`/play/${result.joinCode}`);
  };

  const content = (
    <>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
      ) : (
        <Eye className="mr-2 h-4 w-4 shrink-0" />
      )}
      {children ?? "Preview as student"}
    </>
  );

  if (asDropdownItem) {
    return (
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void handlePreview(); }} disabled={loading}>
        {content}
      </DropdownMenuItem>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => void handlePreview()}
      disabled={loading}
    >
      {content}
    </Button>
  );
}
