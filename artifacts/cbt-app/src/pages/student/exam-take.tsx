import { useGetAttempt, useSaveAnswers, useSubmitAttempt, getGetAttemptQueryKey } from "@workspace/api-client-react";
import { useLocation, useRoute } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ExamTake() {
  const [, params] = useRoute("/student/exam/:examId/take/:attemptId");
  const [, setLocation] = useLocation();
  const examId = parseInt(params?.examId ?? "0", 10);
  const attemptId = parseInt(params?.attemptId ?? "0", 10);
  const queryClient = useQueryClient();

  const { data: attempt, isLoading, error } = useGetAttempt(attemptId, {
    query: { enabled: !!attemptId, refetchOnWindowFocus: false, queryKey: getGetAttemptQueryKey(attemptId) },
  });

  const saveAnswers = useSaveAnswers();
  const submitAttempt = useSubmitAttempt();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize answers and timer from attempt data
  useEffect(() => {
    if (attempt && !initialized) {
      setAnswers(attempt.savedAnswers as Record<string, number> || {});
      setTimeLeft(attempt.timeRemainingSeconds ?? null);
      setInitialized(true);
    }
  }, [attempt, initialized]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || !initialized) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [initialized]);

  const handleAutoSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt.mutateAsync({ id: attemptId });
      setLocation(`/student/results/${result.id}`);
    } catch {
      setLocation(`/student/results`);
    }
  }, [submitting, attemptId, submitAttempt, setLocation]);

  function handleSelectOption(questionId: number, optionIndex: number) {
    const key = String(questionId);
    const newAnswers = { ...answers, [key]: optionIndex };
    setAnswers(newAnswers);
    // Debounced auto-save
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveAnswers.mutate({ id: attemptId, data: { answers: { [key]: optionIndex } } });
    }, 500);
  }

  async function handleManualSubmit() {
    setSubmitting(true);
    // Final save of all answers
    if (Object.keys(answers).length > 0) {
      await saveAnswers.mutateAsync({ id: attemptId, data: { answers } });
    }
    try {
      const result = await submitAttempt.mutateAsync({ id: attemptId });
      setLocation(`/student/results/${result.id}`);
    } catch {
      setLocation(`/student/results`);
    }
  }

  if (isLoading || !initialized) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-muted-foreground">Loading exam...</div>
    </div>
  );
  if (error || !attempt) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-destructive">Exam not found.</div>
    </div>
  );
  if (attempt.status !== "in_progress") {
    setLocation(`/student/results`);
    return null;
  }

  const questions = attempt.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const minutes = Math.floor((timeLeft ?? 0) / 60);
  const seconds = (timeLeft ?? 0) % 60;
  const timerColor = (timeLeft ?? 0) < 300 ? "text-destructive" : (timeLeft ?? 0) < 600 ? "text-amber-500" : "text-foreground";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-semibold truncate max-w-xs">{attempt.examTitle}</div>
          <Badge variant="outline">{answeredCount}/{questions.length} answered</Badge>
        </div>
        <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timerColor}`}>
          <Clock className="h-5 w-5" />
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Exam"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
              <AlertDialogDescription>
                {unansweredCount > 0
                  ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Are you sure you want to submit?`
                  : "You have answered all questions. Are you sure you want to submit?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleManualSubmit}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Question panel */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {currentQuestion ? (
              <>
                <div className="text-sm text-muted-foreground font-medium">
                  Question {currentIndex + 1} of {questions.length}
                </div>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-base font-medium leading-relaxed mb-6">{currentQuestion.text}</p>
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, i) => {
                        const selected = answers[String(currentQuestion.id)] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => handleSelectOption(currentQuestion.id, i)}
                            className={`w-full text-left flex items-center gap-4 px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                              selected
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-primary/40 hover:bg-muted/50"
                            }`}
                          >
                            <span className={`flex-shrink-0 w-7 h-7 rounded-full border-2 text-xs flex items-center justify-center font-bold ${selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground"}`}>
                              {String.fromCharCode(65 + i)}
                            </span>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))} disabled={currentIndex === questions.length - 1}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-12">No questions available.</div>
            )}
          </div>
        </main>

        {/* Question navigator */}
        <aside className="w-60 border-l bg-card overflow-y-auto p-4 hidden md:block">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Question Navigator</div>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, i) => {
              const isAnswered = answers[String(q.id)] !== undefined;
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-8 w-full rounded text-xs font-medium transition-all ${
                    isCurrent
                      ? "ring-2 ring-primary ring-offset-1 bg-primary text-primary-foreground"
                      : isAnswered
                      ? "bg-primary/20 text-primary hover:bg-primary/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-primary/20 inline-block" /> Answered</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-muted inline-block" /> Unanswered</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded ring-2 ring-primary bg-primary inline-block" /> Current</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
