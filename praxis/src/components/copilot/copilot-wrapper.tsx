"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CopilotPanel } from "@/components/copilot/copilot-panel";

export function CopilotWrapper() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname.startsWith("/edit/")) return null;

  return (
    <CopilotPanel
      context={{ page: "dashboard" }}
      open={open}
      onToggle={() => setOpen((o) => !o)}
    />
  );
}
