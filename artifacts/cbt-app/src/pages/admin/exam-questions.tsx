import {
  useListQuestions, useGetExam, useCreateQuestion, useUpdateQuestion,
  useDeleteQuestion, getListQuestionsQueryKey, getGetExamQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuestionDiagram } from "@/components/question-diagram";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ArrowLeft, CheckCircle, Upload, FileJson, FileText, AlertCircle, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuestionForm { text: string; options: string[]; correctOption: number; imagePath: string | null; }
interface ParsedQuestion { text: string; options: string[]; correctOption: number; }
interface ParseError { row: number; message: string; }

const defaultForm: QuestionForm = { text: "", options: ["", "", "", ""], correctOption: 0, imagePath: null };

// ── CSV / JSON parsing helpers ────────────────────────────────────────────────

function parseCSV(raw: string): { questions: ParsedQuestion[]; errors: ParseError[] } {
  const lines = raw.trim().split(/\r?\n/);
  const questions: ParsedQuestion[] = [];
  const errors: ParseError[] = [];

  // Determine if there's a header row
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("text") || firstLine.includes("question") || firstLine.includes("option");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  dataLines.forEach((line, idx) => {
    const row = idx + (hasHeader ? 2 : 1);
    if (!line.trim()) return;

    // Parse CSV respecting quoted fields
    const fields = parseCSVLine(line);
    if (fields.length < 3) {
      errors.push({ row, message: `Expected at least 3 columns (text, options…, correctOption) but got ${fields.length}` });
      return;
    }

    const text = fields[0].trim();
    if (!text) { errors.push({ row, message: "Question text is empty" }); return; }

    // Last field is correctOption, everything in between are option values
    const lastField = fields[fields.length - 1].trim();
    const optionFields = fields.slice(1, fields.length - 1);

    // Resolve correctOption — supports 0-based index ("0","1"…) or letter ("A","B"…)
    let correctOption: number;
    if (/^[A-Fa-f]$/.test(lastField)) {
      correctOption = lastField.toUpperCase().charCodeAt(0) - 65;
    } else {
      correctOption = parseInt(lastField, 10);
      if (isNaN(correctOption)) {
        errors.push({ row, message: `correctOption "${lastField}" must be a number (0-based) or letter (A/B/C…)` });
        return;
      }
    }

    const options = optionFields.map(o => o.trim()).filter(Boolean);
    if (options.length < 2) {
      errors.push({ row, message: `Need at least 2 non-empty options, found ${options.length}` });
      return;
    }
    if (correctOption < 0 || correctOption >= options.length) {
      errors.push({ row, message: `correctOption ${correctOption} is out of range (0–${options.length - 1})` });
      return;
    }
    questions.push({ text, options, correctOption });
  });

  return { questions, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseJSON(raw: string): { questions: ParsedQuestion[]; errors: ParseError[] } {
  const errors: ParseError[] = [];
  let data: unknown;
  try { data = JSON.parse(raw); } catch (e) {
    return { questions: [], errors: [{ row: 0, message: `Invalid JSON: ${(e as Error).message}` }] };
  }

  const arr = Array.isArray(data) ? data : (data as any)?.questions;
  if (!Array.isArray(arr)) {
    return { questions: [], errors: [{ row: 0, message: 'JSON must be an array of questions, or an object with a "questions" array' }] };
  }

  const questions: ParsedQuestion[] = [];
  arr.forEach((item: any, idx: number) => {
    const row = idx + 1;
    const text = String(item?.text ?? "").trim();
    if (!text) { errors.push({ row, message: "Missing or empty 'text' field" }); return; }

    const options: string[] = Array.isArray(item?.options)
      ? item.options.map((o: any) => String(o ?? "").trim()).filter(Boolean)
      : [];
    if (options.length < 2) { errors.push({ row, message: `Need at least 2 options, found ${options.length}` }); return; }

    const rawCorrect = item?.correctOption ?? item?.correct_option ?? item?.answer;
    let correctOption: number;
    if (typeof rawCorrect === "number") {
      correctOption = Math.round(rawCorrect);
    } else if (typeof rawCorrect === "string" && /^[A-Fa-f]$/.test(rawCorrect.trim())) {
      correctOption = rawCorrect.trim().toUpperCase().charCodeAt(0) - 65;
    } else {
      correctOption = parseInt(String(rawCorrect ?? ""), 10);
    }

    if (isNaN(correctOption) || correctOption < 0 || correctOption >= options.length) {
      errors.push({ row, message: `correctOption "${rawCorrect}" is invalid or out of range (0–${options.length - 1})` });
      return;
    }
    questions.push({ text, options, correctOption });
  });

  return { questions, errors };
}

// ── Download template helpers ─────────────────────────────────────────────────
function downloadCSVTemplate() {
  const csv = [
    "text,optionA,optionB,optionC,optionD,correctOption",
    '"What is the capital of France?","London","Paris","Berlin","Madrid","1"',
    '"Which planet is closest to the Sun?","Venus","Earth","Mercury","Mars","2"',
  ].join("\n");
  triggerDownload("questions-template.csv", "text/csv", csv);
}

function downloadJSONTemplate() {
  const json = JSON.stringify([
    { text: "What is the capital of France?", options: ["London", "Paris", "Berlin", "Madrid"], correctOption: 1 },
    { text: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correctOption: 2 },
  ], null, 2);
  triggerDownload("questions-template.json", "application/json", json);
}

function triggerDownload(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
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
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey(examId) });

  // Single question dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<QuestionForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Bulk import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<"csv" | "json">("csv");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Single question handlers ────────────────────────────────────────────────
  function openCreate() { setEditingId(null); setForm(defaultForm); setDialogOpen(true); }
  function openEdit(q: any) {
    setEditingId(q.id);
    setForm({ text: q.text, options: [...q.options], correctOption: q.correctOption, imagePath: q.imagePath ?? null });
    setDialogOpen(true);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const supported = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!supported.includes(file.type)) {
      window.alert("Choose a PNG, JPG, WEBP, or GIF image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      window.alert("Diagram images must be 8 MB or smaller.");
      return;
    }
    setUploadingImage(true);
    try {
      const token = localStorage.getItem("cbt_token");
      const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      let objectPath: string;
      if ("electronAPI" in window) {
        const response = await fetch("/api/storage/uploads", {
          method: "POST",
          headers: { ...auth, "Content-Type": file.type },
          body: file,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Image upload failed.");
        objectPath = data.objectPath;
      } else {
        const response = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Image upload failed.");
        const uploadResponse = await fetch(data.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadResponse.ok) throw new Error("The image could not be saved to cloud storage.");
        objectPath = data.objectPath;
      }
      setForm((current) => ({ ...current, imagePath: objectPath }));
    } catch (error) {
      window.alert((error as Error).message || "Image upload failed.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!form.text.trim() || form.options.filter(o => o.trim()).length < 2 || uploadingImage) return;
    setSaving(true);
    const cleanOptions = form.options.filter(o => o.trim());
    try {
      if (editingId) {
        await updateQuestion.mutateAsync({ id: editingId, data: { text: form.text, options: cleanOptions, correctOption: form.correctOption, imagePath: form.imagePath } });
      } else {
        await createQuestion.mutateAsync({ examId, data: { text: form.text, options: cleanOptions, correctOption: form.correctOption, order: questions?.length ?? 0, imagePath: form.imagePath } });
      }
      await invalidate(); setDialogOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteQuestion.mutateAsync({ id: deleteId }); await invalidate(); setDeleteId(null);
  }

  function updateOption(i: number, val: string) {
    const opts = [...form.options]; opts[i] = val; setForm({ ...form, options: opts });
  }

  // ── Bulk import handlers ────────────────────────────────────────────────────
  function resetImport() {
    setParsedQuestions([]); setParseErrors([]); setRawText(""); setFileName("");
    setImportResult(null); setImportError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openImport() { resetImport(); setImportOpen(true); }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const isJSON = file.name.endsWith(".json");
    if (isJSON) setImportTab("json");
    else setImportTab("csv");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      setRawText(text);
      runParse(isJSON ? "json" : "csv", text);
    };
    reader.readAsText(file);
  }

  function runParse(format: "csv" | "json", text: string) {
    setImportResult(null); setImportError("");
    if (!text.trim()) { setParsedQuestions([]); setParseErrors([]); return; }
    const result = format === "csv" ? parseCSV(text) : parseJSON(text);
    setParsedQuestions(result.questions);
    setParseErrors(result.errors);
  }

  function handleTabChange(tab: string) {
    const t = tab as "csv" | "json";
    setImportTab(t);
    resetImport();
  }

  function handleRawTextChange(text: string) {
    setRawText(text);
    runParse(importTab, text);
  }

  async function handleImport() {
    if (parsedQuestions.length === 0) return;
    setImporting(true); setImportError("");
    try {
      const token = localStorage.getItem("cbt_token");
      const res = await fetch(`/api/exams/${examId}/questions/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ questions: parsedQuestions }),
      });
      const data = await res.json();
      if (!res.ok) { setImportError(data.error ?? "Import failed"); return; }
      setImportResult({ imported: data.imported });
      await invalidate();
    } catch (e) {
      setImportError((e as Error).message);
    } finally { setImporting(false); }
  }

  if (isLoading) return <div className="py-8 text-muted-foreground">Loading questions...</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/admin/exams")} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Exams
      </Button>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{exam?.title}</h2>
          <p className="text-sm text-muted-foreground">{questions?.length ?? 0} question{questions?.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openImport}>
            <Upload className="h-4 w-4 mr-2" /> Bulk Import
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Question
          </Button>
        </div>
      </div>

      {(!questions || questions.length === 0) ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-medium">No questions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add questions one by one or import in bulk.</p>
            <div className="flex justify-center gap-3 mt-4">
              <Button variant="outline" onClick={openImport}><Upload className="h-4 w-4 mr-2" />Bulk Import</Button>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add First Question</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mt-0.5">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-3">{q.text}</p>
                    {q.imagePath && <QuestionDiagram imagePath={q.imagePath} className="mb-4 max-h-72 max-w-full rounded-md border object-contain" />}
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

      {/* ── Single question dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Question" : "New Question"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Question Text</Label>
              <Textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Enter the question here..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Diagram image (optional)</Label>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" id="question-diagram-upload" onChange={handleImageSelect} />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => document.getElementById("question-diagram-upload")?.click()} disabled={uploadingImage}>
                  <Upload className="h-4 w-4 mr-2" />{uploadingImage ? "Uploading…" : form.imagePath ? "Replace image" : "Upload image"}
                </Button>
                <span className="text-xs text-muted-foreground">PNG, JPG, WEBP, or GIF · up to 8 MB</span>
                {form.imagePath && <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, imagePath: null })}>Remove</Button>}
              </div>
              {form.imagePath && <QuestionDiagram imagePath={form.imagePath} alt="Diagram preview" className="max-h-56 max-w-full rounded-md border object-contain" />}
            </div>
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
            <Button onClick={handleSave} disabled={saving || uploadingImage || !form.text.trim() || form.options.filter(o => o.trim()).length < 2}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk import dialog ─────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) resetImport(); setImportOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Bulk Import Questions</DialogTitle>
            <DialogDescription>
              Upload a CSV or JSON file, or paste content directly. Questions are appended to the existing list.
            </DialogDescription>
          </DialogHeader>

          {importResult ? (
            /* Success state */
            <div className="flex-1 flex flex-col items-center justify-center py-10 gap-4">
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Import Successful</p>
                <p className="text-muted-foreground mt-1">{importResult.imported} question{importResult.imported !== 1 ? "s" : ""} added to this exam.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { resetImport(); }}>Import More</Button>
                <Button onClick={() => { resetImport(); setImportOpen(false); }}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <Tabs value={importTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="csv" className="gap-2"><FileText className="h-4 w-4" />CSV</TabsTrigger>
                    <TabsTrigger value="json" className="gap-2"><FileJson className="h-4 w-4" />JSON</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={importTab === "csv" ? downloadCSVTemplate : downloadJSONTemplate} className="text-xs text-muted-foreground">
                      Download template
                    </Button>
                  </div>
                </div>

                <TabsContent value="csv" className="flex-1 flex flex-col gap-3 mt-3 overflow-hidden data-[state=active]:flex">
                  <FormatGuide type="csv" />
                  <FileDropArea fileInputRef={fileInputRef} accept=".csv,text/csv" fileName={fileName} onFileSelect={handleFileSelect} />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Or paste CSV content</Label>
                    <Textarea
                      className="font-mono text-xs min-h-[120px] resize-none"
                      placeholder={'text,optionA,optionB,optionC,optionD,correctOption\n"What is 2+2?","1","2","4","8","2"'}
                      value={rawText}
                      onChange={(e) => handleRawTextChange(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="json" className="flex-1 flex flex-col gap-3 mt-3 overflow-hidden data-[state=active]:flex">
                  <FormatGuide type="json" />
                  <FileDropArea fileInputRef={fileInputRef} accept=".json,application/json" fileName={fileName} onFileSelect={handleFileSelect} />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Or paste JSON content</Label>
                    <Textarea
                      className="font-mono text-xs min-h-[120px] resize-none"
                      placeholder={'[\n  {\n    "text": "What is 2+2?",\n    "options": ["1","2","4","8"],\n    "correctOption": 2\n  }\n]'}
                      value={rawText}
                      onChange={(e) => handleRawTextChange(e.target.value)}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Parse errors */}
              {parseErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> {parseErrors.length} parse error{parseErrors.length !== 1 ? "s" : ""}
                  </p>
                  {parseErrors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive/80">Row {e.row}: {e.message}</p>
                  ))}
                </div>
              )}

              {/* Preview table */}
              {parsedQuestions.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col gap-2 min-h-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4" />
                      {parsedQuestions.length} question{parsedQuestions.length !== 1 ? "s" : ""} ready to import
                    </p>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-6" onClick={resetImport}>
                      <X className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto rounded-lg border divide-y min-h-0 max-h-48">
                    {parsedQuestions.map((q, i) => (
                      <div key={i} className="px-3 py-2.5">
                        <p className="text-xs font-medium truncate">{i + 1}. {q.text}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {q.options.map((opt, oi) => (
                            <span key={oi} className={`text-xs px-1.5 py-0.5 rounded ${oi === q.correctOption ? "bg-green-100 text-green-800 font-medium" : "bg-muted text-muted-foreground"}`}>
                              {String.fromCharCode(65 + oi)}. {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importError && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {importError}
                </p>
              )}
            </div>
          )}

          {!importResult && (
            <DialogFooter className="flex-shrink-0 pt-2">
              <Button variant="outline" onClick={() => { resetImport(); setImportOpen(false); }}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={parsedQuestions.length === 0 || importing}
              >
                {importing ? "Importing..." : `Import ${parsedQuestions.length > 0 ? parsedQuestions.length + " " : ""}Question${parsedQuestions.length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>This question will be permanently deleted.</AlertDialogDescription>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function FormatGuide({ type }: { type: "csv" | "json" }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
      {type === "csv" ? (
        <>
          <p className="font-semibold text-foreground">CSV format</p>
          <p>Columns: <code className="bg-muted px-1 rounded">text, optionA, optionB, …, correctOption</code></p>
          <p><code className="bg-muted px-1 rounded">correctOption</code> is 0-based (0=A, 1=B…) or a letter (A, B, C…). 2–6 options per question.</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-foreground">JSON format</p>
          <p>An array of objects with <code className="bg-muted px-1 rounded">text</code>, <code className="bg-muted px-1 rounded">options</code> (string array), and <code className="bg-muted px-1 rounded">correctOption</code> (0-based index or letter).</p>
        </>
      )}
    </div>
  );
}

function FileDropArea({
  fileInputRef, accept, fileName, onFileSelect,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  fileName: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
      onClick={() => fileInputRef.current?.click()}
    >
      <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={onFileSelect} />
      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
      {fileName ? (
        <p className="text-sm font-medium text-primary">{fileName}</p>
      ) : (
        <>
          <p className="text-sm font-medium">Click to upload</p>
          <p className="text-xs text-muted-foreground mt-0.5">{accept.split(",")[0].replace(".", "").toUpperCase()} file</p>
        </>
      )}
    </div>
  );
}
