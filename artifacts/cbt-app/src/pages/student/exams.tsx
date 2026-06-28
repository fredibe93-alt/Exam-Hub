import { useListExams } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Clock, BookOpen } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function StudentExams() {
  const { data: exams, isLoading } = useListExams();
  const [search, setSearch] = useState("");

  if (isLoading) return <div className="p-8">Loading exams...</div>;

  const filteredExams = exams?.filter(e => 
    e.isActive && 
    (e.title.toLowerCase().includes(search.toLowerCase()) || 
     e.subjectName.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Available Exams</h1>
          <p className="text-muted-foreground mt-1">Browse and take exams assigned to your profile</p>
        </div>
        <div className="w-full md:w-72">
          <Input 
            placeholder="Search exams or subjects..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredExams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No exams found matching your criteria.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <Card key={exam.id} className="flex flex-col h-full">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded">
                    {exam.subjectName}
                  </div>
                  <BookOpen size={20} className="text-muted-foreground" />
                </div>
                <h3 className="font-bold text-xl mb-2 flex-1">{exam.title}</h3>
                {exam.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{exam.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Clock size={16} /> {exam.durationMinutes} mins
                  </span>
                  <span>{exam.questionCount} questions</span>
                  <span>Pass: {exam.passingScore}%</span>
                </div>
                <Link href={`/student/exam/${exam.id}/instructions`}>
                  <Button className="w-full">View Instructions</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
