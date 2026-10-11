import { useListExams, useListSubjects, useCreateExam, useUpdateExam, useDeleteExam, getListExamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText, Clock, ChevronRight } from "lucide-react";

interface ExamForm { title: string; description: string; subjectId: string; durationMinutes: string; passingScore: string; assessmentType: "ca1" | "ca2" | "final"; isActive: boolean; }

const defaultForm: ExamForm = { title: "", description: "", subjectId: "", durationMinutes: "60", passingScore: "50", assessmentType: "final", isActive: true };

const assessmentLabels = { ca1: "CA 1", ca2: "CA 2", final: "Final" } as const;

export default function AdminExams() {
  const queryClient = useQueryClient();
  const { data: exams, isLoading } = useListExams();
  const { data: subjects } = useListSubjects();
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExamForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListExamsQueryKey() });

  function openCreate() { setEditingId(null); setForm(defaultForm); setDialogOpen(true); }
  function openEdit(e: any) {
    setEditingId(e.id);
    setForm({ title: e.title, description: e.description ?? "", subjectId: String(e.subjectId), durationMinutes: String(e.durationMinutes), passingScore: String(e.passingScore), assessmentType: e.assessmentType, isActive: e.isActive });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.subjectId) return;
    setSaving(true);
    try {
      const payload = { title: form.title, description: form.description, subjectId: parseInt(form.subjectId, 10), durationMinutes: parseInt(form.durationMinutes, 10), passingScore: parseInt(form.passingScore, 10), assessmentType: form.assessmentType, isActive: form.isActive };
      if (editingId) { await updateExam.mutateAsync({ id: editingId, data: payload }); }
      else { await createExam.mutateAsync({ data: payload }); }
      await invalidate(); setDialogOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteExam.mutateAsync({ id: deleteId }); await invalidate(); setDeleteId(null);
  }

  if (isLoading) return <div className="py-8 text-muted-foreground">Loading exams...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{exams?.length ?? 0} exam{exams?.length !== 1 ? "s" : ""}</p>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Exam</Button>
      </div>

      {(!exams || exams.length === 0) ? (
        <Card><CardContent className="py-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No exams yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first exam to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="font-semibold truncate">{exam.title}</div>
                    <Badge variant={exam.isActive ? "default" : "secondary"} className="text-xs flex-shrink-0">{exam.isActive ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline" className="text-xs flex-shrink-0">{assessmentLabels[exam.assessmentType]}</Badge>
                  </div>
                  <div className="text-xs text-primary font-medium mb-1">{exam.subjectName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{exam.durationMinutes}m</span>
                    <span>{exam.questionCount} questions</span>
                    <span>Pass: {exam.passingScore}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/admin/exams/${exam.id}/questions`}>
                    <Button variant="outline" size="sm">Questions <ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => openEdit(exam)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(exam.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Exam" : "New Exam"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Introduction to Algebra" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={2} /></div>
            <div className="space-y-1.5"><Label>Subject</Label>
              <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                <SelectContent>{subjects?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Assessment</Label>
              <Select value={form.assessmentType} onValueChange={(value: "ca1" | "ca2" | "final") => setForm({ ...form, assessmentType: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ca1">CA 1</SelectItem>
                  <SelectItem value="ca2">CA 2</SelectItem>
                  <SelectItem value="final">Final Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Duration (minutes)</Label><Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} min={1} /></div>
              <div className="space-y-1.5"><Label>Passing Score (%)</Label><Input type="number" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: e.target.value })} min={1} max={100} /></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Active (visible to students)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.subjectId}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Exam?</AlertDialogTitle><AlertDialogDescription>This will delete the exam and all its questions and results.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
