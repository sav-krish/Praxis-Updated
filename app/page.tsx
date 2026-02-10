"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Compass,
  GraduationCap,
  LineChart,
  Sparkles
} from "lucide-react";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Why it matters", href: "#why-it-matters" },
  { label: "Demo", href: "#demo" }
];

const heroFrames = [
  {
    title: "Background Context",
    body:
      "Your students lead a cross-functional team deciding whether to enter a new market with uneven regulatory risk.",
    type: "context"
  },
  {
    title: "Decision Point",
    body: "Choose a market-entry posture.",
    type: "decision"
  },
  {
    title: "Live Results",
    body: "Class-wide decision distribution updates instantly.",
    type: "results"
  },
  {
    title: "Instructor View",
    body: "Review team choices and scoring in real time.",
    type: "instructor"
  }
] as const;

const differentiators = [
  "You control pacing",
  "You define what ‘good’ looks like",
  "Students commit to a choice",
  "Results turn discussion into analysis"
];

const problemBullets = [
  "A few voices dominate while others stay silent",
  "Silence is mistaken for agreement",
  "Decisions get buried inside discussion",
  "You finish class without knowing what teams actually chose"
];

const simulationFailBullets = [
  "Too rigid to match your course goals",
  "Hard to edit once generated",
  "Built for long assignments, not live class time"
];

const steps = [
  "Upload material or define learning goals",
  "Generate a simulation draft aligned to your class",
  "Edit context, decisions, and scoring",
  "Run live — students join in teams",
  "Review a session report with decision breakdowns"
];

const solutionCards = [
  {
    title: "Editable by Design",
    body: "Generate a draft from your course material — then directly edit every decision, option, and outcome.",
    icon: ClipboardList
  },
  {
    title: "Built for 30-Minute Classes",
    body: "Three decisions. No forced timers. You open and close decisions when it fits your discussion.",
    icon: Compass
  },
  {
    title: "Immediate Insight",
    body: "End-of-session report shows choice distribution (e.g., 10% chose A), scores, and reflections.",
    icon: LineChart
  }
];

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary:
      "bg-accent text-white shadow-subtle hover:bg-[#174A51] focus-visible:ring-accent",
    secondary:
      "border border-accent text-accent hover:bg-accentSoft focus-visible:ring-accent",
    ghost:
      "text-ink hover:bg-white/70 focus-visible:ring-accent"
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
        styles[variant]
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold text-ink md:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base text-muted md:text-lg">{subtitle}</p>
      ) : null}
    </div>
  );
}

function DemoBanner({
  activeIndex,
  setActiveIndex
}: {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const frame = heroFrames[activeIndex];

  const renderFrame = () => {
    if (frame.type === "context") {
      return (
        <div className="flex h-full flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-muted">Background Context</h4>
            <p className="mt-3 text-base text-ink">
              Your students lead a cross-functional team deciding whether to
              enter a new market with uneven regulatory risk.
            </p>
          </div>
          <div className="mt-8 grid gap-3 rounded-xl border border-line bg-white/80 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-muted">
              <span>Briefing</span>
              <span>Week 4</span>
            </div>
            <p className="text-sm text-ink">
              Each team must commit to a market-entry posture before the debate
              opens.
            </p>
          </div>
        </div>
      );
    }

    if (frame.type === "decision") {
      return (
        <div className="flex h-full flex-col">
          <h4 className="text-sm font-semibold text-muted">Decision Point</h4>
          <p className="mt-2 text-base text-ink">
            Choose a market-entry posture.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {["A", "B", "C"].map((option, index) => (
              <div
                key={option}
                className={`rounded-xl border border-line bg-white/85 p-4 transition hover:-translate-y-1 hover:shadow-subtle ${
                  index === 1 ? "border-accent/40" : ""
                }`}
              >
                <p className="text-xs font-semibold text-muted">
                  Option {option}
                </p>
                <p className="mt-2 text-sm text-ink">
                  {index === 0 && "Acquire a local partner to move fast."}
                  {index === 1 && "Launch a pilot with strict guardrails."}
                  {index === 2 && "Delay entry until policy clarity."}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (frame.type === "results") {
      return (
        <div className="flex h-full flex-col">
          <h4 className="text-sm font-semibold text-muted">Live Results</h4>
          <p className="mt-2 text-base text-ink">
            Class-wide decision distribution updates instantly.
          </p>
          <div className="mt-6 space-y-4">
            {[
              { label: "Option A", value: 22 },
              { label: "Option B", value: 54 },
              { label: "Option C", value: 24 }
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs font-semibold text-muted">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-line">
                  <motion.div
                    className="h-3 rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <h4 className="text-sm font-semibold text-muted">Instructor View</h4>
        <p className="mt-2 text-base text-ink">
          Review team choices and scoring in real time.
        </p>
        <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white/90">
          <div className="grid grid-cols-3 bg-accentSoft px-4 py-2 text-xs font-semibold text-muted">
            <span>Team</span>
            <span>Choice</span>
            <span>Score</span>
          </div>
          {[
            ["Orchid", "Option B", "+3"],
            ["Cascade", "Option C", "+1"],
            ["Mariner", "Option A", "0"],
            ["Pine", "Option B", "+2"]
          ].map((row) => (
            <div
              key={row[0]}
              className="grid grid-cols-3 border-t border-line px-4 py-2 text-sm text-ink"
            >
              <span>{row[0]}</span>
              <span>{row[1]}</span>
              <span>{row[2]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="rounded-2xl border border-line bg-white/90 p-6 shadow-soft"
      role="region"
      aria-label="Interactive simulation preview"
    >
      <div className="flex items-center justify-between text-xs font-semibold text-muted">
        <span>Teach Together · Live Session</span>
        <span>Decision 2 of 3</span>
      </div>
      <div className="mt-5 min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            {renderFrame()}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2" role="tablist" aria-label="Simulation frames">
          {heroFrames.map((item, index) => (
            <button
              key={item.title}
              className={`h-2.5 w-2.5 rounded-full border transition ${
                index === activeIndex
                  ? "border-accent bg-accent"
                  : "border-line bg-transparent"
              }`}
              aria-label={`Show ${item.title}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
        <div className="text-xs text-muted">Use arrows or tabs to switch</div>
      </div>
    </div>
  );
}

function RequestDemoModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    school: "",
    email: "",
    course: ""
  });
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button, input"
    );
    focusable?.[0]?.focus();
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      window.addEventListener("keydown", onKeyDown);
    }
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Request a Demo"
    >
      <motion.div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-soft"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-ink">Request a Demo</h3>
            <p className="mt-1 text-sm text-muted">
              Tell us a bit about your course and we will follow up.
            </p>
          </div>
          <button
            className="rounded-full px-2 py-1 text-sm text-muted hover:bg-line"
            onClick={onClose}
            aria-label="Close modal"
          >
            Close
          </button>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-xl border border-line bg-accentSoft p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              Request received
            </div>
            <p className="mt-2 text-sm text-muted">
              We will email you within two business days with next steps.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
            }}
          >
            {[
              {
                id: "name",
                label: "Name",
                type: "text",
                placeholder: "Professor Lee"
              },
              {
                id: "school",
                label: "School",
                type: "text",
                placeholder: "Wharton"
              },
              {
                id: "email",
                label: "Email",
                type: "email",
                placeholder: "lee@university.edu"
              },
              {
                id: "course",
                label: "Course",
                type: "text",
                placeholder: "Strategy & Decision Making"
              }
            ].map((field) => (
              <label key={field.id} className="grid gap-2 text-sm text-ink">
                <span className="font-semibold">{field.label}</span>
                <input
                  required
                  type={field.type}
                  value={form[field.id as keyof typeof form]}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      [field.id]: event.target.value
                    }))
                  }
                  placeholder={field.placeholder}
                  className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
            ))}
            <div className="flex items-center justify-between gap-3">
              <Button type="submit">Submit</Button>
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  const [activeFrame, setActiveFrame] = useState(0);
  const [demoOpen, setDemoOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHovered = useRef(false);

  const advance = () => {
    setActiveFrame((prev) => (prev + 1) % heroFrames.length);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!isHovered.current) {
        advance();
      }
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      setActiveFrame((prev) => (prev + 1) % heroFrames.length);
    }
    if (event.key === "ArrowLeft") {
      setActiveFrame((prev) =>
        prev === 0 ? heroFrames.length - 1 : prev - 1
      );
    }
  };

  const stats = useMemo(
    () => [
      { label: "Decision windows", value: "3" },
      { label: "Live teams", value: "Up to 40" },
      { label: "Setup", value: "< 15 min" }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-10 h-64 w-64 rounded-full bg-[#E6F0EF] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#F0E7DA] blur-3xl" />
        <motion.div
          className="absolute left-1/3 top-24 h-2 w-2 rounded-full bg-accent/30"
          animate={{ y: [0, -12, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-sun/40"
          animate={{ y: [0, 16, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur">
        <nav className="container flex items-center justify-between py-4">
          <span className="text-lg font-semibold text-ink">Teach Together</span>
          <div className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-ink">
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="hidden md:inline-flex"
              onClick={() => setDemoOpen(true)}
            >
              Request a Demo
            </Button>
            <Button
              className="md:hidden"
              onClick={() => setDemoOpen(true)}
            >
              Demo
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="container relative grid gap-12 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-1 text-xs font-semibold text-muted">
              <Sparkles className="h-4 w-4 text-accent" />
              Built for case-based classrooms
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-ink md:text-5xl">
              Run better in-class decisions — not louder discussions.
            </h1>
            <p className="mt-5 text-base text-muted md:text-lg">
              Case discussions don’t scale. Teach Together helps you run
              structured, editable simulations where every team must decide —
              and you can see the results instantly.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button onClick={() => setDemoOpen(true)}>
                Request a Demo <ArrowRight className="h-4 w-4" />
              </Button>
              <a href="#sample" className="inline-flex">
                <Button variant="secondary">See a Sample Simulation</Button>
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 text-sm text-muted">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-line bg-white/70 px-4 py-3 text-center"
                >
                  <div className="text-lg font-semibold text-ink">
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wide">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative"
            onMouseEnter={() => {
              isHovered.current = true;
            }}
            onMouseLeave={() => {
              isHovered.current = false;
            }}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-label="Interactive demo carousel"
          >
            <DemoBanner
              activeIndex={activeFrame}
              setActiveIndex={setActiveFrame}
            />
            <p className="mt-4 text-sm text-muted">
              Designed for a 30-minute class. No timers. You control the pace.
            </p>
          </div>
        </section>

        <section id="why-it-matters" className="container py-16">
          <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <SectionHeader
                eyebrow="Problem"
                title="Case discussions don’t scale — even in great classrooms."
              />
              <ul className="mt-6 space-y-3 text-sm text-muted">
                {problemBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-base font-semibold text-ink">
                Learning breaks down when decisions are implicit instead of
                explicit.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/80 p-6 shadow-subtle">
              <SectionHeader
                eyebrow="Why Simulations Fail"
                title="Simulations work — until they become inflexible."
              />
              <ul className="mt-6 space-y-3 text-sm text-muted">
                {simulationFailBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sun" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-base font-semibold text-ink">
                The simulation should adapt to the professor — not the other way
                around.
              </p>
            </div>
          </div>
        </section>

        <section className="container py-16">
          <SectionHeader
            eyebrow="Solution"
            title="Give every class a decision moment that you can edit."
            subtitle="Teach Together gives you control without sacrificing the energy of live discussion."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {solutionCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-line bg-white/80 p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-soft"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accentSoft">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted">{card.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="container py-16">
          <div className="rounded-2xl border border-line bg-white/80 p-8 shadow-subtle">
            <SectionHeader
              eyebrow="How It Works"
              title="From course material to live decisions in minutes."
            />
            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-xl border border-line bg-white px-4 py-4 text-sm text-muted"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Step {index + 1}
                  </div>
                  <p className="mt-2 text-sm text-ink">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-16">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div className="rounded-2xl border border-line bg-white/85 p-6 shadow-subtle">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                <GraduationCap className="h-4 w-4 text-accent" />
                Classroom Outcomes
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-ink">
                Not a game. Not a black box. A teaching tool.
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-muted">
                {differentiators.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-accentSoft/70 p-8">
              <h3 className="text-2xl font-semibold text-ink">
                Designed with faculty input
              </h3>
              <p className="mt-4 text-sm text-muted">
                Teach Together was developed through interviews with professors
                who needed editable simulations, clear learning alignment, fast
                setup, and meaningful post-class insight.
              </p>
              <div className="mt-6 grid gap-3">
                {["Strategy", "Leadership", "Power & Influence", "Change"].map(
                  (topic) => (
                    <div
                      key={topic}
                      className="flex items-center justify-between rounded-xl border border-line bg-white/80 px-4 py-3 text-sm"
                    >
                      <span className="text-ink">{topic}</span>
                      <span className="text-xs font-semibold text-muted">
                        Case-based
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="sample" className="container py-16">
          <SectionHeader
            eyebrow="Sample Simulation"
            title="See a sample decision flow."
            subtitle="A static preview of the student experience."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-line bg-white/90 p-6 shadow-subtle">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                Decision Prompt
              </div>
              <h3 className="mt-3 text-lg font-semibold text-ink">
                Your team leads a turnaround. Which lever do you pull first?
              </h3>
              <div className="mt-4 grid gap-3">
                {[
                  "Restructure the portfolio",
                  "Refocus on margin discipline",
                  "Protect the talent pipeline"
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-white/90 p-6 shadow-subtle">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                Sample Results
              </div>
              <div className="mt-4 space-y-4">
                {[
                  { label: "Restructure", value: 38 },
                  { label: "Margin discipline", value: 42 },
                  { label: "Talent pipeline", value: 20 }
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs font-semibold text-muted">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-line">
                      <div
                        className="h-3 rounded-full bg-sun"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="demo" className="container py-16">
          <div className="rounded-2xl border border-line bg-ink px-8 py-10 text-white">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                  Request a Demo
                </p>
                <h2 className="mt-3 text-3xl font-semibold">
                  See how this fits your course.
                </h2>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => setDemoOpen(true)}>
                  Request a Demo
                </Button>
                <a href="#sample" className="inline-flex">
                  <Button variant="secondary" className="bg-transparent">
                    View a Sample Simulation
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="container border-t border-line/60 py-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="text-lg font-semibold text-ink">Teach Together</div>
            <p className="mt-2 text-sm text-muted">
              Teach Together · Classroom Decision Simulations
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted">
            {["About", "Privacy", "Terms", "Contact"].map((link) => (
              <a key={link} href="#" className="hover:text-ink">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <RequestDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
