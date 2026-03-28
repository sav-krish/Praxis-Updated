/** Labels shown in editor and play UI for `simulation_sources.source_type`. */
export function sourceTypeDisplayLabel(sourceType: string | null | undefined): string | null {
  switch (sourceType) {
    case "file":
      return "File";
    case "url":
      return "Link";
    case "text":
      return "Text";
    case "manual":
      return "Manual";
    default:
      return null;
  }
}
