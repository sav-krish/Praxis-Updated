"use client";

import dynamic from "next/dynamic";

const CopilotWrapper = dynamic(
  () =>
    import("@/components/copilot/copilot-wrapper").then((m) => m.CopilotWrapper),
  { ssr: false }
);

export function CopilotLazy() {
  return <CopilotWrapper />;
}
