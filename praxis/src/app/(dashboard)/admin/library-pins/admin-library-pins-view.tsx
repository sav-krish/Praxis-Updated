"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Pin, PinOff } from "lucide-react";

export type AdminPinRow = {
  id: string;
  title: string;
  course_topic: string;
  is_pinned: boolean;
  pinned_order: number | null;
  favorite_count: number;
  created_at: string;
};

export function AdminLibraryPinsView({ simulations }: { simulations: AdminPinRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, string>>(() =>
    Object.fromEntries(simulations.map((s) => [s.id, String(s.pinned_order ?? 0)]))
  );

  const pinSignature = simulations.map((s) => `${s.id}:${s.is_pinned}:${s.pinned_order}`).join("|");
  useEffect(() => {
    setOrders(Object.fromEntries(simulations.map((s) => [s.id, String(s.pinned_order ?? 0)])));
  }, [pinSignature, simulations]); // simulations: refresh row list when server returns new titles/order

  async function setPinned(simulationId: string, pinned: boolean) {
    setPendingId(simulationId);
    const orderRaw = orders[simulationId];
    const parsed = parseInt(orderRaw ?? "0", 10);
    const pinnedOrder = Number.isFinite(parsed) ? Math.min(9999, Math.max(0, parsed)) : 0;

    try {
      const res = await fetch("/api/admin/simulations/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulationId,
          pinned,
          pinnedOrder: pinned ? pinnedOrder : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "Update failed");
        return;
      }
      toast.success(pinned ? "Pinned to Top Picks" : "Removed from Top Picks");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Public simulations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {simulations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public simulations yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {simulations.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium line-clamp-2">{s.title}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{s.course_topic}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {s.favorite_count} favorites
                    </Badge>
                    {s.is_pinned && (
                      <Badge className="text-[10px] border-[#fd8c2e]/60 bg-[#fff1e5] text-[#4a1f10] dark:border-[#fd8c2e]/40 dark:bg-[#fd8c2e]/15 dark:text-foreground">
                        Top Pick
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <label htmlFor={`order-${s.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                      Order
                    </label>
                    <Input
                      id={`order-${s.id}`}
                      type="number"
                      min={0}
                      max={9999}
                      className="h-9 w-20"
                      value={orders[s.id] ?? "0"}
                      onChange={(e) =>
                        setOrders((prev) => ({ ...prev, [s.id]: e.target.value }))
                      }
                    />
                  </div>
                  {s.is_pinned ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="min-h-9"
                        disabled={pendingId === s.id}
                        onClick={() => setPinned(s.id, true)}
                      >
                        Save order
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-9"
                        disabled={pendingId === s.id}
                        onClick={() => setPinned(s.id, false)}
                      >
                        {pendingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PinOff className="h-4 w-4 mr-1.5" />
                        )}
                        Unpin
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-9"
                      disabled={pendingId === s.id}
                      onClick={() => setPinned(s.id, true)}
                    >
                      {pendingId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pin className="h-4 w-4 mr-1.5" />
                      )}
                      Pin
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
