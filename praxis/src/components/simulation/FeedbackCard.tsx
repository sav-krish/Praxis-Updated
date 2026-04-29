"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquareHeart, X, Check } from "lucide-react";
import { toast } from "sonner";

interface FeedbackCardProps {
  simulationId: string;
  sessionId?: string;
  userId?: string;
  participantId?: string;
  feedbackType: "post_generation" | "post_session";
  role: "professor" | "student";
  onDismiss?: () => void;
}

const POST_GENERATION_ITEMS = [
  "Decisions were relevant to my topic",
  "Background content was accurate",
  "It took creative liberties I didn't want",
  "The difficulty felt right",
  "Data visualizations were helpful",
];

const POST_SESSION_PROFESSOR_ITEMS = [
  "Students were engaged",
  "Decisions sparked good discussion",
  "The scenario was realistic",
  "I would use this again",
  "The debrief/report was useful",
];

const POST_SESSION_STUDENT_ITEMS = [
  "The scenario was interesting",
  "Decisions felt meaningful",
  "I learned something new",
  "The difficulty was appropriate",
  "I'd do another simulation",
];

export function FeedbackCard({
  simulationId,
  sessionId,
  userId,
  participantId,
  feedbackType,
  role,
  onDismiss,
}: FeedbackCardProps) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [freeformText, setFreeformText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const items =
    feedbackType === "post_generation"
      ? POST_GENERATION_ITEMS
      : role === "professor"
        ? POST_SESSION_PROFESSOR_ITEMS
        : POST_SESSION_STUDENT_ITEMS;

  const title =
    feedbackType === "post_generation"
      ? "How was the generated simulation?"
      : role === "professor"
        ? "How did the simulation perform in class?"
        : "How was your experience?";

  const toggleItem = (item: string) => {
    setCheckedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = async () => {
    if (checkedItems.length === 0 && !freeformText.trim()) {
      onDismiss?.();
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("feedback").insert({
      simulation_id: simulationId,
      session_id: sessionId || null,
      user_id: userId || null,
      participant_id: participantId || null,
      feedback_type: feedbackType,
      role,
      checked_items: checkedItems,
      freeform_text: freeformText.trim() || null,
    });

    if (error) {
      toast.error("Could not save feedback");
      logger.error(error);
    } else {
      setSubmitted(true);
      toast.success("Thanks for the feedback!");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6 text-center">
          <Check className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">Thanks for your feedback!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">
          Select any that apply, or skip if nothing fits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleItem(item)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                checkedItems.includes(item)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:text-foreground hover:border-border"
              }`}
            >
              {checkedItems.includes(item) && <Check className="h-3 w-3" />}
              {item}
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Anything else? (optional)"
          value={freeformText}
          onChange={(e) => setFreeformText(e.target.value)}
          rows={2}
          className="text-sm resize-none"
        />
        <div className="flex justify-end gap-2">
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Skip
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Submit Feedback
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
