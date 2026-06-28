import { useListStudents, useDeleteStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminStudents() {
  const queryClient = useQueryClient();
  const { data: students, isLoading } = useListStudents();
  const deleteStudent = useDeleteStudent();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });

  async function handleDelete() {
    if (!deleteId) return;
    await deleteStudent.mutateAsync({ id: deleteId }); await invalidate(); setDeleteId(null);
  }

  if (isLoading) return <div className="py-8 text-muted-foreground">Loading students...</div>;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">{students?.length ?? 0} registered student{students?.length !== 1 ? "s" : ""}</p>

      {(!students || students.length === 0) ? (
        <Card><CardContent className="py-16 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No students yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-sm text-muted-foreground">{s.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">Joined {format(new Date(s.createdAt), "MMM d, yyyy")}</div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <div className="text-lg font-bold">{s.totalAttempts}</div>
                    <div className="text-xs text-muted-foreground">Attempts</div>
                  </div>
                  <div className="text-center hidden sm:block">
                    <div className="text-lg font-bold text-green-600">{s.passedCount}</div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove Student?</AlertDialogTitle><AlertDialogDescription>This will permanently remove the student account and all their exam records.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
