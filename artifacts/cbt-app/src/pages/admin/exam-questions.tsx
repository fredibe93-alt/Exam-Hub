import { useListQuestions, useGetExam, useCreateQuestion, useUpdateQuestion, useDeleteQuestion, getListQuestionsQueryKey, getGetExamQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ArrowLeft, CheckCircle } from "lucide-react";

interface QuestionForm { text: string; options: string[]; correctOption: number; }
const defaultForm: QuestionForm = { text: "", options: ["", "", "", ""], correctOption: 0 };

export default function AdminExamQuestions() {
  const [, params] = useRoute("/admin/exams/:examId/questions");
  const [, setLocation] = useLocation();
  const examId = parseInt(params?.examId ?? "0", 10);
  const queryClient = useQueryClient();
  const { data: exam } = useGetExam(examId, { query: { enabled: !!examId, queryKey: getGetExamQueryKey(examId) } });
  const { data: questions, isLoading } = useListQuestions(examId, { query: { enabled: !!examId, queryKey: getListQuestionsQueryKey(examId) } });
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<QuestionForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(examId) });

  function openCreate() { setEditingId(null); setForm(defaultForm); setDialogOpen(true); }
  function openEdit(q: any) { setEditingId(q.id); setForm({ text: q.text, options: [...q.options], correctOption: q.correctOption }); setDialogOpen(true); }

  async function handleSave() {
    if (!form.text.trim() || form.options.filter(o => o.trim()).length < 2) return;
    setSaving(true);
    const cleanOptions = form.options.filter(o => o.trim());
    try {
      if (editingId) {
        await updateQuestion.mutateAsync({ id: editingId, data: { text: form.text, options: cleanOptions, correctOption: form.correctOption } });
      } else {
        await createQuestion.mutateAsync({ examId, data: { text: form.text, options: cleanOptions, correctOption: form.correctOption, order: (questions?.length ?? 0) } });
      }
      await invalidate(); setDialogOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteQuestion.mutateAsync({ id: deleteId }); await invalidate(); setDeleteId(null);
  }

  function updateOption(i: number, val: string) {
    const opts = [...form.options];
    opts[i] = val;
    setForm({ ...form, options: opts });
  }

  if (isLoading) return <div className="py-8 text-muted-foreground">Loading questions...</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/admin/exams")} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exams
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{exam?.title}</h2>
          <p className="text-sm text-muted-foreground">{questions?.length ?? 0} question{questions?.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Question</Button>
      </div>

      {(!questions || questions.length === 0) ? (
        <Card><CardContent className="py-16 text-center">
          <p className="font-medium">No questions yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add questions to this exam.</p>
          <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-2"/>Add First Question</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mt-0.5">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-3">{q.text}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded border ${oi === q.correctOption ? "border-green-400 bg-green-50 text-green-800" : "border-border text-muted-foreground"}`}>
                          {oi === q.correctOption && <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />}
                          <span className="font-mono text-xs font-bold">{String.fromCharCode(65 + oi)}.</span>
                          <span className="truncate">{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(q.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Question" : "New Question"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Question Text</Label><Textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Enter the question here..." rows={3} /></div>
            <div className="space-y-2">
              <Label>Answer Options</Label>
              <p className="text-xs text-muted-foreground">Select the correct answer by clicking the radio button.</p>
              {form.options.map((opt, i) => (
                <div key={i} className={`flex items-center gap-3 border rounded-lg px-3 py-2 transition-colors ${form.correctOption === i ? "border-green-400 bg-green-50" : "border-border"}`}>
                  <input type="radio" name="correct" checked={form.correctOption === i} onChange={() => setForm({ ...form, correctOption: i })} className="h-4 w-4 accent-green-600 flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-muted-foreground w-4">{String.fromCharCode(65 + i)}</span>
                  <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} className="border-0 p-0 h-auto focus-visible:ring-0 shadow-none" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.text.trim() || form.options.filter(o=>o.trim()).length < 2}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Question?</AlertDialogTitle><AlertDialogDescription>This question will be permanently deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
