"use client";

import dynamic from "next/dynamic";
import type { AdminAnalyticsViewData } from "@/lib/admin-analytics";

// The full analytics view pulls in recharts + the chart UI primitives, which
// balloons the route's client bundle. In Turbopack dev that 1+ MB of code
// dominates compile time and locks up the UI when navigating between pages.
// Defer it behind next/dynamic so the rest of the admin shell stays snappy.
const AdminAnalyticsView = dynamic(
  () => import("./admin-analytics-view").then((m) => m.AdminAnalyticsView),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
        Loading analytics charts…
      </div>
    ),
  }
);

export function AdminAnalyticsLazy({ data }: { data: AdminAnalyticsViewData }) {
  return <AdminAnalyticsView data={data} />;
}
