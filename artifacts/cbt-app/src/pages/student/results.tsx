import { useListResults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { ArrowRight, ClipboardList } from "lucide-react";

export default function StudentResults() {
  const { data: results, isLoading, error } = useListResults();

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading results...</div>;
  if (error) return <div className="py-12 text-center text-destructive">Failed to load results.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Results</h1>
        <p className="text-muted-foreground mt-1">A record of all your completed exams.</p>
      </div>

      {!results || results.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No results yet</p>
            <p className="text-muted-foreground text-sm mt-1">Take an exam to see your results here.</p>
            <Link href="/student/exams">
              <Button className="mt-4">Browse Exams</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {[...results].reverse().map((result) => (
            <Card key={result.id}>
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-primary mb-1">{result.subjectName}</div>
                  <div className="font-semibold truncate">{result.examTitle}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(result.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xl font-bold">{result.percentage}%</div>
                    <div className="text-xs text-muted-foreground">{result.score}/{result.totalQuestions} correct</div>
                  </div>
                  <Badge variant={result.passed ? "default" : "destructive"} className="w-16 justify-center">
                    {result.passed ? "Passed" : "Failed"}
                  </Badge>
                  <Link href={`/student/results/${result.id}`}>
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
