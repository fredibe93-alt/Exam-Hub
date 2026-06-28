import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, BookOpen, Users, LayoutDashboard, FileText, ClipboardList, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated, isLoading, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && isAdmin) {
      setLocation("/admin/dashboard");
    }
  }, [isLoading, isAuthenticated, isAdmin, setLocation]);

  if (isLoading || !isAuthenticated || isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/student/dashboard" className="flex items-center gap-2 font-semibold text-lg">
              <BookOpen className="h-5 w-5" />
              <span>ExamHub</span>
            </Link>
            <nav className="hidden md:flex gap-4">
              <Link href="/student/dashboard" className={`text-sm font-medium hover:text-white/80 transition-colors ${location === '/student/dashboard' ? 'text-white' : 'text-primary-foreground/70'}`}>Dashboard</Link>
              <Link href="/student/exams" className={`text-sm font-medium hover:text-white/80 transition-colors ${location === '/student/exams' ? 'text-white' : 'text-primary-foreground/70'}`}>Browse Exams</Link>
              <Link href="/student/results" className={`text-sm font-medium hover:text-white/80 transition-colors ${location.startsWith('/student/results') ? 'text-white' : 'text-primary-foreground/70'}`}>My Results</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium hidden sm:inline-block">{user?.name}</span>
            <Button variant="secondary" size="sm" onClick={() => logout()} className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-0">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAuthenticated, isLoading, isAdmin } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    } else if (!isLoading && !isAdmin) {
      setLocation("/student/dashboard");
    }
  }, [isLoading, isAuthenticated, isAdmin, setLocation]);

  if (isLoading || !isAuthenticated || !isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b text-primary font-bold text-lg gap-2">
          <ClipboardList className="h-5 w-5" />
          <span>ExamHub Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <SidebarItem href="/admin/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" active={location === "/admin/dashboard"} />
          <SidebarItem href="/admin/subjects" icon={<BookOpen size={18} />} label="Subjects" active={location.startsWith("/admin/subjects")} />
          <SidebarItem href="/admin/exams" icon={<FileText size={18} />} label="Exams" active={location.startsWith("/admin/exams")} />
          <SidebarItem href="/admin/students" icon={<Users size={18} />} label="Students" active={location.startsWith("/admin/students")} />
          <SidebarItem href="/admin/results" icon={<ClipboardList size={18} />} label="Results" active={location.startsWith("/admin/results")} />
          <SidebarItem href="/admin/report-cards" icon={<GraduationCap size={18} />} label="Report Cards" active={location.startsWith("/admin/report-cards")} />
        </nav>
        <div className="p-4 border-t">
          <div className="text-sm font-medium mb-4 text-muted-foreground px-2">{user?.name}</div>
          <Button variant="outline" className="w-full justify-start" onClick={() => logout()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-16 border-b bg-card flex items-center px-8 shadow-sm z-10 flex-shrink-0">
          <h1 className="text-xl font-semibold">
            {location === "/admin/dashboard" && "Overview"}
            {location.startsWith("/admin/subjects") && "Manage Subjects"}
            {location.startsWith("/admin/exams") && "Manage Exams"}
            {location.startsWith("/admin/students") && "Manage Students"}
            {location.startsWith("/admin/results") && "All Results"}
            {location.startsWith("/admin/report-cards") && "Report Cards"}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ href, icon, label, active }: { href: string; icon: ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
      {icon}
      {label}
    </Link>
  );
}
