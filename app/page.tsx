"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Compass,
  FileText,
  Handshake,
  LineChart,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  Wand2
} from "lucide-react";

const navLinks = [
  { label: "Overview", href: "#overview" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Preview", href: "#preview" },
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
    title: "Post-Session Results",
    body: "See choice distribution after class (e.g., 10% chose A).",
    type: "results"
  },
  {
    title: "Instructor Report",
    body: "Review team choices, scoring, and reflection prompts.",
    type: "instructor"
  }
] as const;

const sampleFrames = [
  {
    title: "Decision Prompt",
    type: "decision"
  },
  {
    title: "Team Result",
    type: "result"
  }
] as const;

const problemBullets = [
  "Students skim the case and a few voices dominate the discussion",
  "Participation is uneven, so many students stay passive",
  "You finish class without measurable outcomes to debrief"
];

const simulationFailBullets = [
  "The simulation is close, but it doesn’t quite match your lesson.",
  "Editing context, decisions, and scoring is limited or painful",
  "Most tools run too long for a single class session"
];

const steps = [
  {
    label: "Upload your case, slides, or learning goals",
    icon: FileText
  },
  {
    label: "Generate a draft simulation aligned to your class",
    icon: Wand2
  },
  {
    label: "Make it yours: edit context, decisions, options, and scoring",
    icon: SlidersHorizontal,
    badge: "Most important"
  },
  {
    label: "Students scan a QR code and join in teams",
    icon: Users
  },
  {
    label: "Debrief with a post-session report and reflection prompts",
    icon: BarChart3
  }
];

const solutionCards = [
  {
    title: "Keep control of your lesson",
    body: "Edit the scenario, decisions, options, and scoring before you run it.",
    icon: ClipboardList
  },
  {
    title: "Drive deeper student thinking",
    body: "Decision points that push teams to debate, defend reasoning, and commit to a choice.",
    icon: Compass
  },
  {
    title: "Debrief with real insight",
    body: "Post-session report shows distributions, scores, and structured reflection prompts.",
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
      "bg-accent text-white shadow-subtle hover:bg-[#1E40AF] focus-visible:ring-accent",
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
  setActiveIndex,
  onNext,
  onPrev
}: {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const frame = heroFrames[activeIndex];

  const renderFrame = () => {
    if (frame.type === "context") {
      return (
        <div className="flex h-full w-full flex-col justify-between">
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
        <div className="flex h-full w-full flex-col">
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
        <div className="flex h-full w-full flex-col">
          <h4 className="text-sm font-semibold text-muted">Post-Session Results</h4>
          <p className="mt-2 text-base text-ink">
            See choice distribution after class (e.g., 10% chose A).
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
      <div className="flex h-full w-full flex-col">
        <h4 className="text-sm font-semibold text-muted">Instructor Report</h4>
        <p className="mt-2 text-base text-ink">
          Review team choices, scoring, and reflection prompts.
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
        <span>Teach Together · In-Class Simulation</span>
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:bg-accentSoft hover:text-ink"
            onClick={onPrev}
            aria-label="Previous frame"
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:bg-accentSoft hover:text-ink"
            onClick={onNext}
            aria-label="Next frame"
          >
            Next
          </button>
        </div>
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
  const [activeSampleFrame, setActiveSampleFrame] = useState(0);
  const [demoOpen, setDemoOpen] = useState(false);
  const [isPreviewPaused, setIsPreviewPaused] = useState(false);

  const goNextFrame = () => {
    setActiveFrame((prev) => (prev + 1) % heroFrames.length);
  };

  const goPrevFrame = () => {
    setActiveFrame((prev) => (prev === 0 ? heroFrames.length - 1 : prev - 1));
  };

  const goNextSampleFrame = () => {
    setActiveSampleFrame((prev) => (prev + 1) % sampleFrames.length);
  };

  const goPrevSampleFrame = () => {
    setActiveSampleFrame((prev) =>
      prev === 0 ? sampleFrames.length - 1 : prev - 1
    );
  };

  useEffect(() => {
    if (isPreviewPaused) return;
    const timer = window.setInterval(goNextFrame, 3000);
    return () => window.clearInterval(timer);
  }, [isPreviewPaused]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSampleFrame((prev) => (prev + 1) % sampleFrames.length);
    }, 3000);
    return () => window.clearInterval(timer);
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

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-canvas text-ink">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(187,214,255,0.42),transparent_42%),radial-gradient(circle_at_80%_75%,rgba(156,194,255,0.35),transparent_40%)]" />
        <div className="absolute -top-32 right-10 h-64 w-64 rounded-full bg-[#D9E7FF] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#CFE2FF] blur-3xl" />
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
        <section className="container relative pb-12 pt-8 md:pb-12 md:pt-10" id="overview">
          <div className="max-w-3xl">
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-ink md:text-5xl">
              Bring real-world learning into classrooms with meaningful simulations.
            </h1>
            <p className="mt-5 text-base text-muted md:text-lg">
              Teach Together starts simple: a clear scenario, decision points,
              and a post-session report for debrief. Scroll to see how the full flow
              works from setup to debrief.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button onClick={() => setDemoOpen(true)}>
                Request a Demo <ArrowRight className="h-4 w-4" />
              </Button>
              <a href="#how-it-works" className="inline-flex">
                <Button variant="secondary">See the Flow</Button>
              </a>
            </div>
          </div>
        </section>

        <section className="container pb-4 pt-8 md:pb-5 md:pt-10">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white/85 p-6 shadow-subtle">
              <SectionHeader
                eyebrow="Problem"
                title="Case discussions feel active, but learning is often passive."
              />
              <ul className="mt-6 space-y-3 text-sm text-muted">
                {problemBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-white/85 p-6 shadow-subtle">
              <SectionHeader
                eyebrow="Constraint"
                title="Most simulation tools are too rigid to fit your class."
              />
              <ul className="mt-6 space-y-3 text-sm text-muted">
                {simulationFailBullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sun" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="container pb-4 pt-2 md:pb-6 md:pt-3">
          <div className="w-full rounded-2xl border border-line bg-white/85 p-6 shadow-subtle">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              Our Advantage
            </p>
            <h3 className="mt-3 text-2xl font-semibold text-ink">
              Built for professors who need control, not templates.
            </h3>
            <p className="mt-3 text-sm text-muted md:text-base">
              Teach Together starts with a draft and hands you full control before class. This way, the simulation fits your objective, not the other way around.
            </p>
          </div>
        </section>

        <section className="container py-4 md:py-6">
          <div className="w-full rounded-2xl border border-line bg-white/85 p-6 shadow-subtle">
            <h3 className="text-2xl font-semibold leading-tight text-ink md:text-3xl">
              Why Simulations Outperform Traditional Cases
            </h3>
            <ul className="mt-6 space-y-4 text-sm leading-relaxed text-muted md:text-base">
              <li className="flex items-start gap-3">
                <BarChart3 className="mt-0.5 h-5 w-5 text-accent" />
                <span><strong className="text-ink">11–14%</strong> stronger applied knowledge</span>
              </li>
              <li className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 text-accent" />
                <span><strong className="text-ink">92%</strong> of recruiters prioritize problem-solving and teamwork</span>
              </li>
              <li className="flex items-start gap-3">
                <Target className="mt-0.5 h-5 w-5 text-accent" />
                <span>Students in active learning environments scored <strong className="text-ink">6%</strong> higher on exams</span>
              </li>
            </ul>
          </div>
        </section>

        <section id="how-it-works" className="container py-8 md:py-10">
          <SectionHeader
            eyebrow="How It Works"
            title="Transform your existing material into a simulation."
          />
          <div className="mt-12 space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.label}
                className={`relative ml-5 rounded-2xl border bg-white/85 p-5 pl-8 shadow-subtle md:flex md:items-center md:gap-5 ${
                  index === 2 ? "border-accent/50" : "border-line"
                }`}
              >
                <div className="absolute left-0 top-1/2 z-10 inline-flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-accentSoft text-sm font-semibold text-accent">
                  {index + 1}
                </div>
                <step.icon className="h-5 w-5 text-accent" />
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink md:mt-0 md:text-base">
                  {step.label}
                  {step.badge ? (
                    <span className="inline-flex items-center rounded-full border border-accent/40 bg-accentSoft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                      {step.badge}
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="preview" className="container py-8 md:py-10">
          <SectionHeader
            eyebrow="Instructor Preview"
            title="Turn live decisions into measurable insight."
          />
          <div className="mt-10 grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-stretch">
            <div
              className="relative flex h-full flex-col"
              onMouseEnter={() => setIsPreviewPaused(true)}
              onMouseLeave={() => setIsPreviewPaused(false)}
              onFocusCapture={() => setIsPreviewPaused(true)}
              onBlurCapture={() => setIsPreviewPaused(false)}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              aria-label="Interactive demo carousel"
            >
              <div className="flex-1">
                <DemoBanner
                  activeIndex={activeFrame}
                  setActiveIndex={setActiveFrame}
                  onNext={goNextFrame}
                  onPrev={goPrevFrame}
                />
              </div>
            </div>
            <div className="h-full rounded-2xl border border-line bg-white/90 p-6 shadow-subtle">
              <h3 className="text-2xl font-semibold leading-tight text-ink md:text-3xl">
                Built for case-based classrooms.
              </h3>
              <ul className="mt-6 space-y-4 text-base leading-relaxed text-muted md:text-lg">
                <li className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-accent" />
                  <span>Trained on business cases to match how you already teach</span>
                </li>
                <li className="flex items-start gap-3">
                  <SlidersHorizontal className="mt-0.5 h-5 w-5 text-accent" />
                  <span>Add your context and goals before generating the draft</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 text-accent" />
                  <span>Students scan a QR code to join instantly in teams</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="sample" className="container py-8 md:py-10">
          <SectionHeader
            eyebrow="Student Preview"
            title="Experience the Decision in Action."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-line bg-white/90 p-6 shadow-subtle">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
                <span>{sampleFrames[activeSampleFrame].title}</span>
                <span>Screen {activeSampleFrame + 1} of {sampleFrames.length}</span>
              </div>
              <div className="mt-3 min-h-[240px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    className="w-full"
                    key={activeSampleFrame}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                  >
                    {sampleFrames[activeSampleFrame].type === "decision" ? (
                      <div className="w-full">
                        <h3 className="text-lg font-semibold text-ink">
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
                    ) : (
                      <div className="w-full">
                        <h3 className="text-lg font-semibold text-ink">
                          Your team selected: Refocus on margin discipline
                        </h3>
                        <div className="mt-4 rounded-xl border border-line bg-accentSoft/50 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                              Points Earned
                            </span>
                            <span className="rounded-full border border-accent/40 bg-white px-3 py-1 text-xs font-semibold text-accent">
                              +3
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-ink">
                            Strong short-term execution and clear operating focus.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-2">
                  {sampleFrames.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      className={`h-2.5 w-2.5 rounded-full border transition ${
                        index === activeSampleFrame
                          ? "border-accent bg-accent"
                          : "border-line bg-transparent"
                      }`}
                      aria-label={`Show ${item.title}`}
                      aria-pressed={index === activeSampleFrame}
                      onClick={() => setActiveSampleFrame(index)}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:bg-accentSoft hover:text-ink"
                    onClick={goPrevSampleFrame}
                    aria-label="Previous sample screen"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:bg-accentSoft hover:text-ink"
                    onClick={goNextSampleFrame}
                    aria-label="Next sample screen"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-white/90 p-6 shadow-subtle">
              <h3 className="text-2xl font-semibold leading-tight text-ink md:text-3xl">
                A lightweight, real-world simulation experience
              </h3>
              <ul className="mt-6 space-y-4 text-base leading-relaxed text-muted md:text-lg">
                <li className="flex items-start gap-3">
                  <Target className="mt-0.5 h-5 w-5 text-accent" />
                  <span>Students focus on one clear decision at a time</span>
                </li>
                <li className="flex items-start gap-3">
                  <Handshake className="mt-0.5 h-5 w-5 text-accent" />
                  <span>Students collaborate in teams before committing to a choice</span>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="mt-0.5 h-5 w-5 text-accent" />
                  <span>Students see how their decisions translate into real consequences</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="container py-8 md:py-10" id="results">
          <SectionHeader
            eyebrow="Outcome"
            title="End every class with clarity."
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

        <section id="demo" className="container py-8 md:py-10">
          <div className="w-full rounded-2xl border border-line bg-white/90 p-6 shadow-subtle">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              Request a Demo
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-ink">
              See how this fits your course.
            </h2>
            <p className="mt-3 text-sm text-muted">
              We will walk through a case-based class setup tailored to your teaching goals.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Button onClick={() => setDemoOpen(true)}>
                Request a Demo
              </Button>
              <a href="#sample" className="inline-flex">
                <Button variant="secondary">
                  View a Sample Simulation
                </Button>
              </a>
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
