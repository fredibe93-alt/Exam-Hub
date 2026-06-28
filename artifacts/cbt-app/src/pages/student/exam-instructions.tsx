import { useGetExam, useStartAttempt, getGetExamQueryKey } from "@workspace/api-client-react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function ExamInstructions() {
  const [, params] = useRoute("/student/exam/:id/instructions");
  const [, setLocation] = useLocation();
  const examId = parseInt(params?.id ?? "0", 10);
  const { data: exam, isLoading, error } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const startAttempt = useStartAttempt();
  const [starting, setStarting] = useState(false);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading exam details...</div>;
  if (error || !exam) return <div className="p-8 text-center text-destructive">Exam not found.</div>;

  async function handleStart() {
    setStarting(true);
    try {
      const attempt = await startAttempt.mutateAsync({ examId });
      setLocation(`/student/exam/${examId}/take/${attempt.id}`);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/student/exams")} className="mb-2 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exams
      </Button>

      <div>
        <div className="text-sm font-medium text-primary mb-1">{exam.subjectName}</div>
        <h1 className="text-3xl font-bold">{exam.title}</h1>
        {exam.description && <p className="mt-2 text-muted-foreground">{exam.description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <div className="text-2xl font-bold">{exam.durationMinutes}</div>
            <div className="text-xs text-muted-foreground">Minutes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <div className="text-2xl font-bold">{exam.questionCount}</div>
            <div className="text-xs text-muted-foreground">Questions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div className="text-2xl font-bold">{exam.passingScore}%</div>
            <div className="text-xs text-muted-foreground">Pass Score</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Exam Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Please read the following instructions carefully before starting the exam:</p>
          <ul className="space-y-2 list-none">
            {[
              "Once started, the timer cannot be paused. Ensure you have a stable internet connection.",
              "Each question is multiple choice. Select the best answer from the options provided.",
              "Your answers are auto-saved as you proceed. You can revisit questions using the question navigator.",
              `You must score at least ${exam.passingScore}% to pass this exam.`,
              "When the timer expires, your exam will be submitted automatically.",
              "You may click Submit at any time to end the exam early.",
            ].map((rule, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleStart} disabled={starting} className="px-10">
          {starting ? "Starting..." : "Begin Exam"}
        </Button>
      </div>
    </div>
  );
}
