import { useGetResult, getGetResultQueryKey } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MinusCircle, ArrowLeft, Trophy } from "lucide-react";
import { format } from "date-fns";

export default function ResultDetail() {
  const [, params] = useRoute("/student/results/:id");
  const [, setLocation] = useLocation();
  const resultId = parseInt(params?.id ?? "0", 10);
  const { data: result, isLoading, error } = useGetResult(resultId, { query: { enabled: !!resultId, queryKey: getGetResultQueryKey(resultId) } });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading result...</div>;
  if (error || !result) return <div className="py-12 text-center text-destructive">Result not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/student/results")} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Results
      </Button>

      {/* Summary card */}
      <Card className={`border-2 ${result.passed ? "border-green-500" : "border-destructive"}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-primary mb-1">{result.subjectName}</div>
              <h1 className="text-2xl font-bold">{result.examTitle}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(result.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <Badge variant={result.passed ? "default" : "destructive"} className="text-lg px-4 py-1.5">
              {result.passed ? "PASSED" : "FAILED"}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{result.percentage}%</div>
              <div className="text-xs text-muted-foreground mt-1">Score</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{result.score}/{result.totalQuestions}</div>
              <div className="text-xs text-muted-foreground mt-1">Correct</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-3xl font-bold">{result.totalQuestions - result.score}</div>
              <div className="text-xs text-muted-foreground mt-1">Incorrect</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question review */}
      {'questionReview' in result && Array.isArray((result as any).questionReview) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Question Review</h2>
          {(result as any).questionReview.map((q: any, i: number) => (
            <Card key={q.questionId} className={`border-l-4 ${q.isCorrect ? "border-l-green-500" : q.selectedOption === null ? "border-l-muted-foreground" : "border-l-destructive"}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {q.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : q.selectedOption === null ? (
                      <MinusCircle className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-3">Q{i + 1}. {q.text}</p>
                    <div className="space-y-2">
                      {q.options.map((option: string, oi: number) => {
                        const isCorrect = oi === q.correctOption;
                        const isSelected = oi === q.selectedOption;
                        return (
                          <div
                            key={oi}
                            className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${
                              isCorrect && isSelected
                                ? "bg-green-50 text-green-800 border border-green-300"
                                : isCorrect
                                ? "bg-green-50 text-green-800 border border-green-300"
                                : isSelected
                                ? "bg-red-50 text-red-800 border border-red-300"
                                : "text-muted-foreground"
                            }`}
                          >
                            <span className="font-mono text-xs font-bold w-5">{String.fromCharCode(65 + oi)}.</span>
                            <span className="flex-1">{option}</span>
                            {isCorrect && <span className="text-green-600 text-xs font-semibold">Correct</span>}
                            {isSelected && !isCorrect && <span className="text-destructive text-xs font-semibold">Your answer</span>}
                          </div>
                        );
                      })}
                    </div>
                    {q.selectedOption === null && (
                      <p className="text-xs text-muted-foreground mt-2">Not answered</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
