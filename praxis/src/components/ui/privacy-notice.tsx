import { ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground mt-2 leading-relaxed">
      <ShieldCheck className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
      <span>
        <strong className="text-foreground font-medium">Your materials are private.</strong>{" "}
        These materials will not be used to train the model. All uploaded files
        are permanently deleted after your simulation is generated.
      </span>
    </p>
  );
}
