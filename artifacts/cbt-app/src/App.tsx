import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { StudentLayout, AdminLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";

import StudentDashboard from "@/pages/student/dashboard";
import StudentExams from "@/pages/student/exams";
import ExamInstructions from "@/pages/student/exam-instructions";
import ExamTake from "@/pages/student/exam-take";
import StudentResults from "@/pages/student/results";
import ResultDetail from "@/pages/student/result-detail";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminSubjects from "@/pages/admin/subjects";
import AdminExams from "@/pages/admin/exams";
import AdminExamQuestions from "@/pages/admin/exam-questions";
import AdminStudents from "@/pages/admin/students";
import AdminResults from "@/pages/admin/results";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Student routes */}
      <Route path="/student/dashboard">
        <StudentLayout><StudentDashboard /></StudentLayout>
      </Route>
      <Route path="/student/exams">
        <StudentLayout><StudentExams /></StudentLayout>
      </Route>
      <Route path="/student/exam/:id/instructions">
        <StudentLayout><ExamInstructions /></StudentLayout>
      </Route>
      <Route path="/student/results">
        <StudentLayout><StudentResults /></StudentLayout>
      </Route>
      <Route path="/student/results/:id">
        <StudentLayout><ResultDetail /></StudentLayout>
      </Route>

      {/* Exam Take — full screen, no layout */}
      <Route path="/student/exam/:examId/take/:attemptId" component={ExamTake} />

      {/* Admin routes */}
      <Route path="/admin/dashboard">
        <AdminLayout><AdminDashboard /></AdminLayout>
      </Route>
      <Route path="/admin/subjects">
        <AdminLayout><AdminSubjects /></AdminLayout>
      </Route>
      <Route path="/admin/exams">
        <AdminLayout><AdminExams /></AdminLayout>
      </Route>
      <Route path="/admin/exams/:examId/questions">
        <AdminLayout><AdminExamQuestions /></AdminLayout>
      </Route>
      <Route path="/admin/students">
        <AdminLayout><AdminStudents /></AdminLayout>
      </Route>
      <Route path="/admin/results">
        <AdminLayout><AdminResults /></AdminLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
