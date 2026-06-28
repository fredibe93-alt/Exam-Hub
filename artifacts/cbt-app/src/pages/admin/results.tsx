import { useListAllResults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";

export default function AdminResults() {
  const { data: results, isLoading, error } = useListAllResults();

  if (isLoading) return <div className="py-8 text-muted-foreground">Loading results...</div>;
  if (error) return <div className="py-8 text-destructive">Failed to load results.</div>;

  const sorted = results ? [...results].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()) : [];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{sorted.length} result{sorted.length !== 1 ? "s" : ""} total</p>

      {sorted.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No results yet</p>
          <p className="text-sm text-muted-foreground mt-1">Results will appear here once students complete exams.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((result) => (
            <Card key={result.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{result.studentName}</div>
                  <div className="text-sm text-muted-foreground truncate">{result.examTitle}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(result.submittedAt), "MMM d, yyyy 'at' h:mm a")}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-bold">{result.percentage}%</div>
                    <div className="text-xs text-muted-foreground">{result.score}/{result.totalQuestions}</div>
                  </div>
                  <Badge variant={result.passed ? "default" : "destructive"} className="w-16 justify-center text-xs">
                    {result.passed ? "Passed" : "Failed"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
