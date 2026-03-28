"use client";

import dynamic from "next/dynamic";
import type { SimulationEditorProps } from "./simulation-editor";

const SimulationEditor = dynamic(
  () => import("./simulation-editor").then((mod) => mod.SimulationEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  }
);

export function SimulationEditorDynamic(props: SimulationEditorProps) {
  return <SimulationEditor {...props} />;
}
