import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, FileText, ClipboardList, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data, isLoading, error } = useGetAdminDashboard();

  if (isLoading) return <div className="py-8 text-muted-foreground">Loading dashboard...</div>;
  if (error || !data) return <div className="py-8 text-destructive">Failed to load dashboard.</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Students" value={data.totalStudents} icon={<Users className="h-5 w-5 text-blue-500" />} />
        <StatCard title="Exams" value={data.totalExams} icon={<FileText className="h-5 w-5 text-indigo-500" />} />
        <StatCard title="Subjects" value={data.totalSubjects} icon={<BookOpen className="h-5 w-5 text-violet-500" />} />
        <StatCard title="Attempts" value={data.totalAttempts} icon={<ClipboardList className="h-5 w-5 text-cyan-500" />} />
        <StatCard title="Pass Rate" value={`${data.passRate}%`} icon={<TrendingUp className="h-5 w-5 text-green-500" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Results</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentResults.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No results yet.</div>
            ) : (
              <div className="divide-y">
                {data.recentResults.slice(0, 8).map((result) => (
                  <div key={result.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{result.studentName}</div>
                      <div className="text-xs text-muted-foreground truncate">{result.examTitle}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-sm">{result.percentage}%</span>
                      <Badge variant={result.passed ? "default" : "destructive"} className="text-xs w-14 justify-center">
                        {result.passed ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exam Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exam Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.examStats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No exams yet.</div>
            ) : (
              <div className="divide-y">
                {data.examStats.map((stat) => (
                  <div key={stat.examId} className="px-6 py-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-medium text-sm truncate flex-1 pr-4">{stat.examTitle}</div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{stat.attempts} attempts</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${stat.passRate}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">{stat.passRate}% pass</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">{icon}</div>
      </CardContent>
    </Card>
  );
}
