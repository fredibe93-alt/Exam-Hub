import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, FileText, User, ChevronRight } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StudentSummary {
  id: number; name: string; email: string;
  totalAttempts: number; passedCount: number;
}

interface ExamResult {
  examId: number; examTitle: string;
  assessmentType: "ca1" | "ca2" | "final";
  score: number; totalQuestions: number;
  percentage: number; passed: boolean; grade: string;
  submittedAt: string;
}

interface AssessmentTotal { totalScore: number; totalQuestions: number; percentage: number; grade: string; }

interface SubjectResult {
  subjectId: number; subjectName: string;
  exams: ExamResult[];
  assessmentTotals: { ca1: AssessmentTotal; ca2: AssessmentTotal; final: AssessmentTotal };
  totalScore: number; totalQuestions: number;
  percentage: number; grade: string;
}

interface ReportCard {
  student: { id: number; name: string; email: string };
  generatedAt: string;
  subjects: SubjectResult[];
  grandTotal: { totalScore: number; totalQuestions: number; percentage: number; grade: string; passed: boolean };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradeColor(g: string) {
  if (g === "A") return "bg-green-100 text-green-800 border-green-300";
  if (g === "B") return "bg-blue-100 text-blue-800 border-blue-300";
  if (g === "C") return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (g === "D") return "bg-orange-100 text-orange-800 border-orange-300";
  return "bg-red-100 text-red-800 border-red-300";
}

function gradeLabel(g: string) {
  const map: Record<string, string> = { A: "Distinction", B: "Credit", C: "Merit", D: "Pass", F: "Fail" };
  return map[g] ?? g;
}

const assessmentLabels = { ca1: "CA 1", ca2: "CA 2", final: "Final" } as const;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("cbt_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminReportCards() {
  const [selectedId, setSelectedId] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: students } = useQuery<StudentSummary[]>({
    queryKey: ["students-list"],
    queryFn: () => fetchJSON("/api/students"),
  });

  const { data: report, isLoading: loadingReport, error: reportError } = useQuery<ReportCard>({
    queryKey: ["report-card", selectedId],
    queryFn: () => fetchJSON(`/api/students/${selectedId}/report-card`),
    enabled: !!selectedId,
  });

  function handlePrint() {
    const printContents = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Report Card — ${report?.student.name ?? ""}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Georgia, 'Times New Roman', serif; background: white; color: #111; padding: 32px; }
        .rc-shell { max-width: 760px; margin: 0 auto; border: 2px solid #1e3a8a; border-radius: 8px; overflow: hidden; }
        .rc-header { background: #1e3a8a; color: white; padding: 24px 32px; text-align: center; }
        .rc-header h1 { font-size: 22px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
        .rc-header p { font-size: 13px; opacity: 0.85; letter-spacing: 1px; }
        .rc-meta { display: flex; justify-content: space-between; padding: 16px 32px; background: #f0f4ff; border-bottom: 1px solid #c7d2fe; font-size: 13px; }
        .rc-meta strong { display: block; font-size: 15px; color: #1e3a8a; }
        .rc-body { padding: 24px 32px; }
        .subject-block { margin-bottom: 24px; }
        .subject-header { background: #1e3a8a; color: white; padding: 8px 14px; border-radius: 4px 4px 0 0; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; }
        .assessment-summary { display: flex; background: #eff4ff; border-bottom: 1px solid #c7d2fe; }
        .assessment-summary > div { flex: 1; text-align: center; padding: 7px 4px; border-right: 1px solid #c7d2fe; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #e8eeff; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #4338ca; border-bottom: 1px solid #c7d2fe; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .grade-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-weight: bold; font-size: 13px; }
        .grade-A { background: #dcfce7; color: #166534; }
        .grade-B { background: #dbeafe; color: #1e40af; }
        .grade-C { background: #fef9c3; color: #854d0e; }
        .grade-D { background: #ffedd5; color: #9a3412; }
        .grade-F { background: #fee2e2; color: #991b1b; }
        .subject-total td { background: #f0f4ff; font-weight: bold; font-size: 13px; }
        .grand-total-row { background: #1e3a8a; color: white; }
        .grand-total-row td { padding: 12px; font-weight: bold; font-size: 14px; }
        .grand-total-row .grade-badge { background: rgba(255,255,255,0.2); color: white; }
        .verdict { text-align: center; padding: 20px; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
        .verdict.pass { color: #166534; }
        .verdict.fail { color: #991b1b; }
        .scale-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 20px; margin-top: 20px; font-size: 11px; color: #64748b; }
        .scale-box span { display: inline-block; margin-right: 16px; }
        .generated { text-align: right; font-size: 11px; color: #94a3b8; margin-top: 16px; }
        .empty { text-align: center; padding: 40px; color: #64748b; font-style: italic; }
      </style>
    </head><body>${printContents}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  return (
    <div className="space-y-6">
      {/* Student selector */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Select Student</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Choose a student…" />
                </SelectTrigger>
                <SelectContent>
                  {students?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      <span className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.name}
                        <span className="text-muted-foreground text-xs">({s.email})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {report && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" /> Print / Save PDF
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Empty / loading states */}
      {!selectedId && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-muted-foreground">Select a student to generate their report card</p>
        </div>
      )}

      {selectedId && loadingReport && (
        <div className="text-center py-16 text-muted-foreground">Generating report card…</div>
      )}

      {selectedId && reportError && (
        <Card><CardContent className="py-10 text-center text-destructive">Failed to load report card.</CardContent></Card>
      )}

      {/* Report Card */}
      {report && (
        <div ref={printRef}>
          <ReportCardView report={report} />
        </div>
      )}
    </div>
  );
}

// ── Report Card View (also used for print) ────────────────────────────────────
function ReportCardView({ report }: { report: ReportCard }) {
  const { student, generatedAt, subjects, grandTotal } = report;
  const isEmpty = subjects.length === 0;

  return (
    <div className="rc-shell border-2 border-[#1e3a8a] rounded-lg overflow-hidden shadow-lg bg-white">
      {/* Header */}
      <div className="rc-header bg-[#1e3a8a] text-white px-8 py-6 text-center">
        <h1 className="text-xl font-bold tracking-widest uppercase mb-1">ExamHub</h1>
        <p className="text-sm opacity-80 tracking-wider uppercase">Student Term Report Card</p>
      </div>

      {/* Student meta */}
      <div className="rc-meta bg-blue-50 border-b border-blue-200 px-8 py-4 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-xs text-blue-500 uppercase tracking-wide font-semibold">Student Name</span>
          <p className="font-semibold text-[#1e3a8a] text-base mt-0.5">{student.name}</p>
        </div>
        <div>
          <span className="text-xs text-blue-500 uppercase tracking-wide font-semibold">Email</span>
          <p className="font-medium mt-0.5">{student.email}</p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-xs text-blue-500 uppercase tracking-wide font-semibold">Date Generated</span>
          <p className="font-medium mt-0.5">{new Date(generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div className="rc-body px-8 py-6 space-y-6">
        {isEmpty ? (
          <div className="empty py-12 text-center text-muted-foreground italic">
            This student has not completed any exams yet.
          </div>
        ) : (
          <>
            {/* Per-subject tables */}
            {subjects.map((subj) => (
              <div key={subj.subjectId} className="subject-block rounded-lg overflow-hidden border border-blue-200">
                <div className="subject-header bg-[#1e3a8a] text-white px-4 py-2.5 text-xs font-bold tracking-wider uppercase">
                  {subj.subjectName}
                </div>
                <div className="assessment-summary grid grid-cols-3 divide-x border-b border-blue-100 bg-blue-50/60 text-center">
                  {(["ca1", "ca2", "final"] as const).map((type) => {
                    const total = subj.assessmentTotals[type];
                    return (
                      <div key={type} className="px-2 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-blue-700">{assessmentLabels[type]}</div>
                        <div className="text-xs font-semibold text-slate-800">{total.totalQuestions ? `${total.totalScore}/${total.totalQuestions} · ${total.percentage}%` : "—"}</div>
                      </div>
                    );
                  })}
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-blue-50 text-xs uppercase tracking-wide text-blue-700">
                      <th className="px-4 py-2.5 text-left font-semibold">Exam / Assessment</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Score</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Total</th>
                      <th className="px-4 py-2.5 text-center font-semibold">%</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Grade</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subj.exams.map((ex) => (
                      <tr key={ex.examId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium">
                          <span className="block">{ex.examTitle}</span>
                          <span className="text-[10px] uppercase tracking-wide text-blue-700">{assessmentLabels[ex.assessmentType]}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono">{ex.score}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-muted-foreground">{ex.totalQuestions}</td>
                        <td className="px-4 py-2.5 text-center font-mono">{ex.percentage}%</td>
                        <td className="px-4 py-2.5 text-center">
                          <GradeBadge grade={ex.grade} />
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">{gradeLabel(ex.grade)}</td>
                      </tr>
                    ))}
                    {/* Subject total row */}
                    {subj.exams.length > 1 && (
                      <tr className="bg-blue-50 font-semibold text-sm border-t-2 border-blue-200">
                        <td className="px-4 py-2.5 text-blue-800">Subject Total</td>
                        <td className="px-4 py-2.5 text-center font-mono text-blue-800">{subj.totalScore}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-blue-600">{subj.totalQuestions}</td>
                        <td className="px-4 py-2.5 text-center font-mono text-blue-800">{subj.percentage}%</td>
                        <td className="px-4 py-2.5 text-center"><GradeBadge grade={subj.grade} /></td>
                        <td className="px-4 py-2.5 text-center text-xs text-blue-700">{gradeLabel(subj.grade)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Grand total */}
            <div className="rounded-lg overflow-hidden border-2 border-[#1e3a8a]">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr className="bg-[#1e3a8a] text-white font-bold text-base">
                    <td className="px-4 py-3.5">GRAND TOTAL</td>
                    <td className="px-4 py-3.5 text-center font-mono">{grandTotal.totalScore}</td>
                    <td className="px-4 py-3.5 text-center font-mono opacity-80">{grandTotal.totalQuestions}</td>
                    <td className="px-4 py-3.5 text-center font-mono">{grandTotal.percentage}%</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-block px-3 py-0.5 rounded-full bg-white/20 text-white font-bold text-base">
                        {grandTotal.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm opacity-90">{gradeLabel(grandTotal.grade)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Verdict */}
            <div className={`text-center py-4 rounded-lg font-bold text-lg tracking-wider border-2 ${grandTotal.passed ? "border-green-400 bg-green-50 text-green-800" : "border-red-400 bg-red-50 text-red-800"}`}>
              {grandTotal.passed ? "✓ OVERALL RESULT: PASS" : "✗ OVERALL RESULT: FAIL"}
            </div>

            {/* Grading scale */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground mr-3">Grading Scale:</span>
              {[["A", "70–100%", "Distinction"], ["B", "60–69%", "Credit"], ["C", "50–59%", "Merit"], ["D", "40–49%", "Pass"], ["F", "0–39%", "Fail"]].map(([g, range, label]) => (
                <span key={g} className="mr-4 inline-flex items-center gap-1">
                  <span className={`font-bold px-1.5 rounded border ${gradeColor(g)}`}>{g}</span>
                  <span>{range} — {label}</span>
                </span>
              ))}
            </div>

            <p className="text-right text-xs text-muted-foreground">
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-xs font-bold ${gradeColor(grade)}`}>
      {grade}
    </span>
  );
}
