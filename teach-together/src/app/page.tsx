import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, BarChart3, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Teach Together</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/join">
              <Button variant="ghost">Join Session</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Interactive Classroom Simulations
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Create engaging decision-based exercises for your students. 
            No student accounts required - just share a code and start learning together.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                Create Your First Simulation
              </Button>
            </Link>
            <Link href="/join">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Join a Session
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
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
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
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
      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span>Teach Together</span>
          </div>
          <p>Built for educators, by educators</p>
        </div>
      </footer>
    </div>
  );
}
