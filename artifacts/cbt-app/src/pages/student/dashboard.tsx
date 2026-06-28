import { useGetStudentDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookOpen, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function StudentDashboard() {
  const { data, isLoading, error } = useGetStudentDashboard();

  if (isLoading) return <div className="p-8">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-destructive">Failed to load dashboard</div>;
  if (!data) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Exams" value={data.totalExams} icon={<BookOpen size={20} className="text-primary" />} />
        <StatCard title="Completed" value={data.completedExams} icon={<CheckCircle size={20} className="text-muted-foreground" />} />
        <StatCard title="Passed" value={data.passedExams} icon={<CheckCircle size={20} className="text-green-600" />} />
        <StatCard title="Avg Score" value={`${Math.round(data.averageScore)}%`} icon={<Clock size={20} className="text-blue-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Available Exams</h2>
            <Link href="/student/exams" className="text-sm font-medium text-primary hover:underline flex items-center">
              View All <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          {data.availableExams.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No exams currently available.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.availableExams.slice(0, 3).map((exam) => (
                <Card key={exam.id}>
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <div className="text-sm text-primary font-medium mb-1">{exam.subjectName}</div>
                      <h3 className="font-semibold text-lg">{exam.title}</h3>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock size={14}/> {exam.durationMinutes} mins</span>
                        <span>•</span>
                        <span>{exam.questionCount} questions</span>
                      </div>
                    </div>
                    <Link href={`/student/exam/${exam.id}/instructions`}>
                      <Button>Start</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Results</h2>
            <Link href="/student/results" className="text-sm font-medium text-primary hover:underline flex items-center">
              View All <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          {data.recentResults.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No results yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.recentResults.map((result) => (
                <Card key={result.id}>
                  <CardContent className="p-5 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{result.examTitle}</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(result.submittedAt), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-lg">{result.percentage}%</div>
                        <div className={`text-xs font-medium uppercase ${result.passed ? 'text-green-600' : 'text-destructive'}`}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </div>
                      </div>
                      <Link href={`/student/results/${result.id}`}>
                        <Button variant="outline" size="sm">Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
