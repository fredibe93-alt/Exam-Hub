import { useListSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";

interface SubjectForm { name: string; description: string; }

export default function AdminSubjects() {
  const queryClient = useQueryClient();
  const { data: subjects, isLoading } = useListSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SubjectForm>({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });

  function openCreate() { setEditingId(null); setForm({ name: "", description: "" }); setDialogOpen(true); }
  function openEdit(s: any) { setEditingId(s.id); setForm({ name: s.name, description: s.description }); setDialogOpen(true); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateSubject.mutateAsync({ id: editingId, data: form });
      } else {
        await createSubject.mutateAsync({ data: form });
      }
      await invalidate();
      setDialogOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteSubject.mutateAsync({ id: deleteId });
    await invalidate();
    setDeleteId(null);
  }

  if (isLoading) return <div className="py-8 text-muted-foreground">Loading subjects...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{subjects?.length ?? 0} subject{subjects?.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Subject</Button>
      </div>

      {(!subjects || subjects.length === 0) ? (
        <Card><CardContent className="py-16 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No subjects yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create subjects to organize your exams.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {subjects.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm text-muted-foreground mt-0.5 truncate">{s.description || "No description"}</div>
                  <div className="text-xs text-primary mt-1 font-medium">{s.examCount} exam{s.examCount !== 1 ? "s" : ""}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Subject" : "New Subject"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this subject" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
            <AlertDialogDescription>This will delete the subject and all its exams and questions. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
