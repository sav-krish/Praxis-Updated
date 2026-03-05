"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SubscribeButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelUrl: "/pricing" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleSubscribe} disabled={loading} className={className}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Redirecting…
        </>
      ) : (
        "Subscribe"
      )}
    </Button>
  );
}
