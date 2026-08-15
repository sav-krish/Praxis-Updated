"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquareHeart, X, Check, Send } from "lucide-react";
import { toast } from "sonner";

interface FeedbackCardProps {
  simulationId: string;
  sessionId?: string;
  userId?: string;
  participantId?: string;
  feedbackType: "post_generation" | "post_session";
  role: "professor" | "student";
  variant?: "default" | "studentCompletion";
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
  "I didn’t like it",
  "Was okay, but not engaging",
];

export function FeedbackCard({
  simulationId,
  sessionId,
  userId,
  participantId,
  feedbackType,
  role,
  variant = "default",
  onDismiss,
}: FeedbackCardProps) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [freeformText, setFreeformText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isStudentCompletion =
    variant === "studentCompletion" && feedbackType === "post_session" && role === "student";

  const items =
    feedbackType === "post_generation"
      ? POST_GENERATION_ITEMS
      : role === "professor"
        ? POST_SESSION_PROFESSOR_ITEMS
        : POST_SESSION_STUDENT_ITEMS;

  const title = isStudentCompletion
    ? "Help us improve Praxis"
    :
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
      <Card className={isStudentCompletion ? "border-[#fed7aa] bg-[#fffaf5] dark:border-[#7c2d12] dark:bg-[#1f170f]" : "border-primary/20 bg-primary/5"}>
        <CardContent className="py-6 text-center">
          <Check className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium">Thanks for your feedback!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isStudentCompletion ? "gap-0 overflow-hidden rounded-xl border-[#fed7aa] bg-[#fffdfb] py-0 dark:border-[#374151] dark:bg-[#111827]" : "border-primary/20"}>
      <CardHeader className={isStudentCompletion ? "px-4 pb-3 pt-4 sm:px-5" : "pb-3"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={isStudentCompletion ? "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff1e8] text-[#ea580c] dark:bg-[#7c2d12]/35 dark:text-[#fb923c]" : "contents"}>
              <MessageSquareHeart className="h-5 w-5 text-primary shrink-0" />
            </span>
            <CardTitle className="text-base text-[#111827] dark:text-[#f9fafb]">{title}</CardTitle>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className={isStudentCompletion ? "text-xs text-[#6b7280] dark:text-[#9ca3af]" : "text-xs"}>
          {isStudentCompletion
            ? "Your feedback helps us build better learning experiences."
            : "Select any that apply, or skip if nothing fits"}
        </CardDescription>
      </CardHeader>
      <CardContent className={isStudentCompletion ? "space-y-4 px-4 pb-4 sm:px-5" : "space-y-4"}>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleItem(item)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                checkedItems.includes(item)
                  ? isStudentCompletion
                    ? "border-[#fb923c] bg-[#fff1e8] text-[#9a3412] dark:border-[#fb923c] dark:bg-[#7c2d12]/35 dark:text-[#fdba74]"
                    : "border-primary bg-primary text-primary-foreground"
                  : isStudentCompletion
                    ? "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#fed7aa] hover:text-[#9a3412] dark:border-[#374151] dark:bg-[#111827] dark:text-[#9ca3af]"
                    : "border-transparent bg-muted text-muted-foreground hover:border-border hover:text-foreground"
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
          className={isStudentCompletion ? "resize-none rounded-lg border-[#e5e7eb] bg-white text-sm placeholder:text-[#9ca3af] dark:border-[#374151] dark:bg-[#111827]" : "text-sm resize-none"}
        />
        <div className="flex justify-end gap-2">
          {onDismiss && (
            <Button variant="ghost" size="sm" className={isStudentCompletion ? "text-[#6b7280] hover:bg-transparent hover:text-[#374151] dark:text-[#9ca3af] dark:hover:text-[#f9fafb]" : undefined} onClick={onDismiss}>
              {isStudentCompletion ? "Skip feedback" : "Skip"}
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className={isStudentCompletion ? "bg-[#ea580c] text-white hover:bg-[#c2410c] hover:text-white dark:bg-[#fb923c] dark:text-[#431407] dark:hover:bg-[#f97316]" : undefined}>
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Submit Feedback
            {!submitting && isStudentCompletion ? <Send className="ml-1.5 h-3.5 w-3.5" aria-hidden /> : null}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
