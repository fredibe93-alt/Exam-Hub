import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, ShieldCheck, Clock, BarChart } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <BookOpen className="h-6 w-6" />
          <span>ExamHub</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-medium text-primary">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button className="font-medium">Create Account</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
            Professional Certification & <br className="hidden md:block" />
            <span className="text-primary">Testing Platform</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Secure, reliable, and rigorous computer-based testing. Designed for academic institutions and professional certification bodies.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base">Get Started as Student</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-base border-2">Administrator Login</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full text-left">
          <FeatureCard 
            icon={<ShieldCheck className="h-6 w-6 text-primary" />}
            title="Secure Testing"
            description="Enterprise-grade security ensuring academic integrity and reliable test delivery."
          />
          <FeatureCard 
            icon={<Clock className="h-6 w-6 text-primary" />}
            title="Precision Timing"
            description="Synchronized exam sessions with reliable auto-submission protocols."
          />
          <FeatureCard 
            icon={<BarChart className="h-6 w-6 text-primary" />}
            title="Instant Analytics"
            description="Immediate scoring and comprehensive performance breakdowns by subject."
          />
        </div>
      </main>

      <footer className="border-t py-8 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} ExamHub. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-xl border bg-card shadow-sm">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
