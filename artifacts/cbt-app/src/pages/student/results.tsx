import { getMyReportCard, useListResults } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { ArrowRight, ClipboardList, Download } from "lucide-react";

const assessmentLabels = { ca1: "CA 1", ca2: "CA 2", final: "Final" } as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export default function StudentResults() {
  const { data: results, isLoading, error } = useListResults();

  async function downloadReportCard() {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      window.alert("Allow pop-ups to open the printable report card.");
      return;
    }
    try {
      const report = await getMyReportCard();
      const subjectSections = report.subjects.map((subject) => {
        const examRows = subject.exams.map((exam) => `
          <tr><td>${escapeHtml(exam.examTitle)}</td><td>${assessmentLabels[exam.assessmentType]}</td>
          <td>${exam.score}/${exam.totalQuestions}</td><td>${exam.percentage}%</td><td>${exam.grade}</td></tr>`).join("");
        const totals = (["ca1", "ca2", "final"] as const).map((type) => {
          const total = subject.assessmentTotals[type];
          return `<span><strong>${assessmentLabels[type]}:</strong> ${total.totalQuestions ? `${total.totalScore}/${total.totalQuestions} (${total.percentage}%)` : "—"}</span>`;
        }).join("");
        return `<section><h2>${escapeHtml(subject.subjectName)}</h2><div class="totals">${totals}</div>
          <table><thead><tr><th>Assessment</th><th>Type</th><th>Score</th><th>%</th><th>Grade</th></tr></thead>
          <tbody>${examRows}<tr class="total"><td>Subject Total</td><td></td><td>${subject.totalScore}/${subject.totalQuestions}</td><td>${subject.percentage}%</td><td>${subject.grade}</td></tr></tbody></table></section>`;
      }).join("");
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Report Card - ${escapeHtml(report.student.name)}</title>
        <style>
          *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:32px}
          header{background:#1e3a8a;color:white;padding:24px;text-align:center}h1{margin:0;font-size:24px}
          .meta{padding:16px;background:#eff4ff;display:flex;justify-content:space-between;gap:16px}
          section{margin-top:24px;break-inside:avoid}h2{background:#1e3a8a;color:white;padding:9px 12px;margin:0}
          .totals{display:flex;justify-content:space-around;gap:8px;padding:10px;background:#eff4ff;font-size:12px}
          table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border:1px solid #dbe2ed;text-align:left}
          th{background:#e4ecfb;text-transform:uppercase;font-size:10px}.total{font-weight:bold;background:#f1f5fb}
          .grand{margin-top:24px;background:#1e3a8a;color:white;padding:14px;font-weight:bold;display:flex;justify-content:space-between}
          @media print{body{margin:12mm}button{display:none}}
        </style></head><body><header><h1>ExamHub</h1><p>Student Report Card</p></header>
        <div class="meta"><div><strong>${escapeHtml(report.student.name)}</strong><br>${escapeHtml(report.student.email)}</div>
        <div>Generated ${new Date(report.generatedAt).toLocaleDateString()}</div></div>
        ${subjectSections || "<p>No completed assessments yet.</p>"}
        <div class="grand"><span>GRAND TOTAL · ${report.grandTotal.grade} · ${report.grandTotal.passed ? "PASS" : "FAIL"}</span>
        <span>${report.grandTotal.totalScore}/${report.grandTotal.totalQuestions} · ${report.grandTotal.percentage}%</span></div>
        </body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 350);
    } catch {
      printWindow.close();
      window.alert("Could not generate your report card. Please try again.");
    }
  }

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading results...</div>;
  if (error) return <div className="py-12 text-center text-destructive">Failed to load results.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My Results</h1>
          <p className="text-muted-foreground mt-1">A record of all your completed exams.</p>
        </div>
        {!!results?.length && (
          <Button variant="outline" onClick={downloadReportCard}>
            <Download className="h-4 w-4 mr-2" /> Download Report Card
          </Button>
        )}
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
