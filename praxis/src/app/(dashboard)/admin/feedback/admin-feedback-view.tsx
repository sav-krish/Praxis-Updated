"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquareHeart, ArrowLeft } from "lucide-react";

interface FeedbackItem {
  id: string;
  simulation_title: string;
  submitter_name: string;
  checked_items: string[];
  freeform_text: string | null;
  created_at: string;
}

interface AdminFeedbackViewProps {
  feedback: FeedbackItem[];
  currentType: string;
  currentRole: string;
}

export function AdminFeedbackView({
  feedback,
  currentType,
  currentRole,
}: AdminFeedbackViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/feedback?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0 min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Feedback</h1>
            <p className="text-sm text-muted-foreground">View all user feedback</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={currentType} onValueChange={(v) => updateFilter("type", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Feedback type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="post_generation">Post-generation</SelectItem>
            <SelectItem value="post_session">Post-session</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currentRole} onValueChange={(v) => updateFilter("role", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="professor">Professor</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {feedback.length === 0 ? (
        <Card className="border-muted">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquareHeart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No feedback matches your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <Card key={item.id} className="border-border">
              <CardContent className="pt-6 space-y-3">
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="font-medium text-foreground">{item.submitter_name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{item.simulation_title}</span>
                  <span className="text-muted-foreground ml-auto">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2">
                  {item.checked_items.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.checked_items.map((c) => (
                        <span
                          key={c}
                          className="text-sm text-foreground"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.freeform_text && (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{item.freeform_text}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
