import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface VideoGalleryDecision {
  id: string;
  order_num: number;
  prompt: string;
  options: Array<{ id: string; label: string; title: string }>;
}

export interface VideoGalleryItem {
  id: string;
  decision_id: string;
  option_id: string;
  participant_id: string;
  participant_name: string;
  video_url: string;
  mime_type: string;
  duration_seconds: number | null;
  created_at: string;
}

interface VideoJustificationGalleryProps {
  decisions: VideoGalleryDecision[];
  videos: VideoGalleryItem[];
  emptyLabel?: string;
}

export function VideoJustificationGallery({
  decisions,
  videos,
  emptyLabel = "No video justifications have been submitted yet.",
}: VideoJustificationGalleryProps) {
  if (videos.length === 0) {
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
            <Badge variant="outline" className="w-fit mb-2">
              Decision {decision.order_num}
            </Badge>
            <CardTitle className="text-base sm:text-lg">{decision.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {decision.options.map((option) => {
              const optionVideos = videos.filter(
                (video) => video.decision_id === decision.id && video.option_id === option.id
              );

              return (
                <div key={option.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge>{option.label}</Badge>
                      <span className="text-sm font-medium truncate">{option.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {optionVideos.length} response{optionVideos.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {optionVideos.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No students selected this option with a video justification.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {optionVideos.map((video) => (
                        <div key={video.id} className="rounded-xl border border-border bg-card p-3 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{video.participant_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(video.created_at).toLocaleString()}
                              </p>
                            </div>
                            {video.duration_seconds ? (
                              <Badge variant="secondary">{video.duration_seconds}s</Badge>
                            ) : null}
                          </div>
                          <video controls preload="metadata" className="w-full rounded-lg bg-black">
                            <source src={video.video_url} type={video.mime_type} />
                          </video>
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
