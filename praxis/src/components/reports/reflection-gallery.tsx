import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ReflectionGalleryItem {
  id: string;
  response: string;
  participant_name: string;
  question: string;
}

interface ReflectionGalleryProps {
  items: ReflectionGalleryItem[];
  emptyLabel?: string;
}

export function ReflectionGallery({
  items,
  emptyLabel = "No reflection responses have been submitted yet.",
}: ReflectionGalleryProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </CardContent>
      </Card>
    );
  }

  const questions = [...new Set(items.map((item) => item.question))];

  return (
    <div className="space-y-6">
      {questions.map((question) => {
        const questionItems = items.filter((item) => item.question === question);
        return (
          <Card key={question}>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {questionItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-medium">{item.participant_name}</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.response}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
