import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, BarChart3, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-4 sm:py-6">
        <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
            <span className="text-xl sm:text-2xl font-bold truncate">Teach Together</span>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link href="/join" className="min-h-[44px] flex items-center">
              <Button variant="ghost" className="min-h-[44px]">Join Session</Button>
            </Link>
            <Link href="/login" className="min-h-[44px] flex items-center">
              <Button variant="outline" className="min-h-[44px]">Login</Button>
            </Link>
            <Link href="/signup" className="min-h-[44px] flex items-center">
              <Button className="min-h-[44px]">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-10 sm:py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6">
            Interactive Classroom Simulations
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8">
            Create engaging decision-based exercises for your students. 
            No student accounts required - just share a code and start learning together.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 min-h-[48px]">
                Create Your First Simulation
              </Button>
            </Link>
            <Link href="/join" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 min-h-[48px]">
                Join a Session
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mt-16 sm:mt-24">
          <div className="bg-card rounded-xl p-6 border shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Creation</h3>
            <p className="text-muted-foreground">
              Upload your course materials and let AI help generate realistic decision scenarios.
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-6 border shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Team or Individual</h3>
            <p className="text-muted-foreground">
              Students can work alone or in teams. Auto-assign or let them self-organize.
            </p>
          </div>
          
          <div className="bg-card rounded-xl p-6 border shadow-sm">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Results</h3>
            <p className="text-muted-foreground">
              See how students responded, analyze patterns, and export detailed reports.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16 sm:mt-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-12">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h4 className="font-semibold mb-2">Create Simulation</h4>
              <p className="text-sm text-muted-foreground">
                Upload materials and define your learning objectives
              </p>
            </div>
            <div>
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h4 className="font-semibold mb-2">Start Session</h4>
              <p className="text-sm text-muted-foreground">
                Generate a join code and share with your class
              </p>
            </div>
            <div>
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h4 className="font-semibold mb-2">Students Decide</h4>
              <p className="text-sm text-muted-foreground">
                Students make choices and see consequences unfold
              </p>
            </div>
            <div>
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                4
              </div>
              <h4 className="font-semibold mb-2">Review Results</h4>
              <p className="text-sm text-muted-foreground">
                Analyze decisions and facilitate discussion
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 sm:py-8 mt-16 sm:mt-20 border-t">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground text-center sm:text-left">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 shrink-0" />
            <span>Teach Together</span>
          </div>
          <p>Built for educators, by educators</p>
        </div>
      </footer>
    </div>
  );
}
