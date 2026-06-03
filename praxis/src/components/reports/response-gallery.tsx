import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ResponseGalleryDecision {
  id: string;
  order_num: number;
  prompt: string;
  options: Array<{ id: string; label: string; title: string }>;
}

export interface ResponseGalleryItem {
  id: string;
  decision_id: string;
  option_id: string;
  participant_id: string | null;
  participant_name: string;
  response_type: "text" | "video";
  justification: string | null;
  video_url: string | null;
  mime_type: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface ResponseGalleryProps {
  decisions: ResponseGalleryDecision[];
  items: ResponseGalleryItem[];
  emptyLabel?: string;
}

export function ResponseGallery({
  decisions,
  items,
  emptyLabel = "No responses have been submitted yet.",
}: ResponseGalleryProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {decisions.map((decision) => (
        <Card key={decision.id}>
          <CardHeader>
            <Badge variant="outline" className="mb-2 w-fit">
              Decision {decision.order_num}
            </Badge>
            <CardTitle className="text-base sm:text-lg">{decision.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {decision.options.map((option) => {
              const optionItems = items.filter(
                (item) => item.decision_id === decision.id && item.option_id === option.id
              );

              return (
                <div key={option.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge>{option.label}</Badge>
                      <span className="truncate text-sm font-medium">{option.title}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {optionItems.length} response{optionItems.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {optionItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No responses for this option yet.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {optionItems.map((item) => (
                        <div key={item.id} className="space-y-3 rounded-xl border border-border bg-card p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.participant_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge variant="secondary">
                                {item.response_type === "video" ? "Video" : "Text"}
                              </Badge>
                              {item.response_type === "video" && item.duration_seconds ? (
                                <Badge variant="outline">{item.duration_seconds}s</Badge>
                              ) : null}
                            </div>
                          </div>

                          {item.response_type === "video" && item.video_url ? (
                            <video controls preload="metadata" className="w-full rounded-lg bg-black">
                              <source src={item.video_url} type={item.mime_type || "video/webm"} />
                            </video>
                          ) : (
                            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
                              {item.justification || "No written response provided."}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
