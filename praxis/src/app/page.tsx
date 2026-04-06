"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { ReactLenis } from "lenis/react";
import { FadeIn } from "@/components/landing/fade-in";
import { HowItWorksHorizontalScroll } from "@/components/landing/how-it-works";
import { FaqSection } from "@/components/landing/faq-section";

/* ─────────────────────────── Data ─────────────────────────── */

const navLinks = [
  { label: "About", href: "#about" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
  { label: "Pricing", href: "/pricing" },
] as const;

/** Lavender / mint / sky pastel tiles: flat, no border (reference: analyst-style recognition cards). */
const LANDING_TILE_BACKGROUNDS = [
  "bg-[linear-gradient(160deg,#ecefff_0%,#f5f6fc_50%,#e2e8fa_100%)]",
  "bg-[linear-gradient(160deg,#e8f2eb_0%,#f4f8f5_50%,#ddebe2_100%)]",
  "bg-[linear-gradient(160deg,#e3f1fb_0%,#f2f9fd_50%,#d7e8f5_100%)]",
] as const;

const impactMetrics = [
  {
    value: 95,
    suffix: "%+",
    label: "Class Participation",
    body: "Increases class participation to over 95%. Every student engages.",
  },
  {
    value: 90,
    suffix: "%",
    label: "Less Prep Time",
    body: "Reduces active learning preparation time by 90%.",
  },
  {
    value: 100,
    suffix: "%",
    label: "Real-World Skills",
    body: "Builds critical thinking, collaboration, and decision-making skills students need.",
    isQualitative: true,
  },
];

const testimonials = [
  {
    quote:
      "This was amazing to implement in class. It was easy to build and students enjoyed the tool. Every professor should use this!",
    name: "Steve Gray",
    title: "Associate Professor of Management",
    subtitle: "Director & Herb Kelleher Chair in Entrepreneurship",
  },
  {
    quote:
      "The simulation tool is impressive. The three decisions it generated were spot on.",
    name: "Constantinos Coutifaris",
    title: "Assistant Professor of Management",
  },
  {
    quote:
      "An exciting tool with a clean interface. The simulation-building process was intuitive and easy to complete.",
    name: "Natalie Gilliam (Croitoru)",
    title: "Assistant Professor of Management",
  },
];

/* ─────────────────────────── Shared Components ─────────────────────────── */

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
      "border-2 border-transparent bg-accent text-white shadow-subtle hover:bg-accent/90 focus-visible:ring-accent",
    secondary:
      "border-2 border-accent text-accent hover:bg-accentSoft focus-visible:ring-accent",
    ghost:
      "border-2 border-transparent text-ink hover:bg-white/70 focus-visible:ring-accent",
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

/* Counter animation for impact section */
function AnimatedCounter({
  target,
  suffix = "",
  isQualitative = false,
}: {
  target: number;
  suffix?: string;
  isQualitative?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || isQualitative) return;
    let start = 0;
    const duration = 1600;
    const step = Math.max(1, Math.floor(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, isQualitative]);

  if (isQualitative) {
    return (
      <span ref={ref} className="tabular-nums">
        ∞
      </span>
    );
  }

  return (
    <span ref={ref} className="tabular-nums">
      {count}
      {suffix}
    </span>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: integrate with a mailing list backend
    setSubscribed(true);
  };

  return (
    <ReactLenis root>
      <div
        data-landing="true"
        className="relative isolate min-h-screen overflow-x-visible text-ink"
      >
      {/* Background: fixed gradient + soft accents (scrolls with viewport) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "linear-gradient(155deg, #e4e9ff 0%, #f3f7ff 32%, #e3f2ff 62%, #efe8ff 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(ellipse 85% 55% at 15% 12%, rgba(168, 85, 247, 0.1), transparent 52%), radial-gradient(ellipse 75% 50% at 88% 78%, rgba(6, 182, 212, 0.08), transparent 48%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(99, 102, 241, 0.05), transparent 55%)",
          }}
        />
        <div className="absolute -top-32 right-10 h-64 w-64 rounded-full bg-[#c7d7ff]/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#b8e4ff]/30 blur-3xl" />
      </div>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-white/65 backdrop-blur-md safe-area-inset-top supports-backdrop-filter:bg-white/55">
        <nav className="container flex items-center justify-between gap-2 px-4 py-2 sm:gap-3 sm:px-6 sm:py-2.5">
          <Link href="/" className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
            <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-white p-0.5">
              <Image
                src="/logo.jpg"
                alt="Praxis"
                width={96}
                height={73}
                className="h-6 w-auto sm:h-7"
                priority
              />
            </span>
            <span className="truncate text-sm font-semibold text-ink sm:text-base">
              Praxis
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative inline-block pb-0.5 text-base font-semibold text-muted transition-all duration-200 ease-out hover:-translate-y-0.5 hover:text-ink md:text-lg after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:bg-accent after:transition-[width] after:duration-300 after:ease-out hover:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/join"
              className="hidden md:inline-flex items-center"
            >
              <Button
                variant="ghost"
                className="h-9 max-h-9 px-3 text-base font-semibold leading-none md:h-9 md:px-3.5 md:text-lg"
              >
                Join Session
              </Button>
            </Link>
            <Link
              href="/signup"
              className="hidden md:inline-flex items-center"
            >
              <Button className="h-9 max-h-9 px-3 text-base font-semibold leading-none md:h-9 md:px-3.5 md:text-lg">
                Get Started
              </Button>
            </Link>
            <Link href="/join" className="inline-flex items-center md:hidden">
              <Button
                variant="ghost"
                className="h-9 max-h-9 px-3 text-base font-semibold leading-none"
              >
                Join
              </Button>
            </Link>
            <Link href="/signup" className="inline-flex items-center md:hidden">
              <Button className="h-9 max-h-9 px-3 text-base font-semibold leading-none">
                Start
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero (about) ── */}
        <section
          id="about"
          className="container relative scroll-mt-19 pb-16 pt-12 md:pb-20 md:pt-16"
        >
          <FadeIn className="mx-auto max-w-3xl text-center">
            <h1 className="mt-4 text-4xl font-bold leading-[1.12] text-ink md:text-[3.25rem]">
              Prepare students for the{" "}
              <span className="bg-gradient-to-r from-accent to-[#8ec5eb] bg-clip-text text-transparent">
                real decisions
              </span>{" "}
              AI can&apos;t make.
            </h1>
            <div className="mx-auto mt-6 flex w-fit max-w-full flex-col items-center gap-7 pb-4 sm:mt-8 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-center sm:gap-4 sm:pb-5 md:gap-6">
              <Link
                href="/signup"
                className="flex min-h-[48px] w-fit justify-center"
              >
                <Button
                  className="min-h-[48px] w-fit whitespace-nowrap px-10 text-base !font-bold shadow-none"
                  style={{
                    boxShadow:
                      "0 16px 36px rgba(0,0,0,0.2), 0 5px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  Try Now for Free
                </Button>
              </Link>
              <a
                href="#how-it-works"
                className="flex min-h-[48px] w-fit justify-center"
              >
                <Button
                  variant="secondary"
                  className="min-h-[48px] w-fit whitespace-nowrap bg-white/95 px-10 text-base !font-bold shadow-none"
                  style={{
                    boxShadow:
                      "0 16px 36px rgba(0,0,0,0.2), 0 5px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  See How It Works
                </Button>
              </a>
            </div>
          </FadeIn>
        </section>

        {/* ── Problem ── */}
        <section id="problem" className="container py-12 md:py-16">
          <FadeIn className="max-w-3xl mx-auto text-center">

            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl leading-tight">
              We are educating students in an AI world.
            </h2>
            <p className="mt-4 text-base text-muted md:text-lg leading-relaxed max-w-2xl mx-auto">
              Traditional assignments can be automated in seconds, but
              classrooms haven&apos;t adapted. The skills that matter most are the
              ones AI cannot replicate.
            </p>
          </FadeIn>

          <div className="mt-12 grid gap-6 md:grid-cols-3 md:items-stretch">
            {[
              {
                stat: "In Seconds",
                label: "AI Completes Assignments",
                body: "Traditional assignments such as essays, problem sets, and case write-ups can be automated instantly. The classroom hasn't caught up.",
              },
              {
                stat: "80%+",
                label: "Employers Prioritize These Skills",
                body: "Critical thinking, collaboration, and decision-making are among the top hiring priorities. These are the skills simulations build.",
              },
              {
                stat: "40%+",
                label: "Educator Burnout Rate",
                body: "Faculty burnout is at record highs. Building deeper learning experiences from scratch takes time most educators don't have.",
              },
            ].map((card, i) => (
              <FadeIn key={card.label} delay={i * 0.1} className="h-full min-h-0">
                <div
                  className={`flex h-full min-h-[280px] w-full flex-col items-center justify-center rounded-3xl p-8 text-center md:min-h-[300px] ${LANDING_TILE_BACKGROUNDS[i % 3]}`}
                >
                  <p className="text-2xl font-bold text-accent">
                    {card.stat}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {card.label}
                  </p>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {card.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="mt-10 max-w-2xl mx-auto">
            <div className="rounded-3xl shadow-subtle animate-aurora-border">
              <div
                className={`rounded-[calc(1.5rem-1.5px)] px-6 py-6 text-center ${LANDING_TILE_BACKGROUNDS[0]}`}
              >
                <p className="text-lg font-semibold text-ink md:text-xl leading-snug">
                  &ldquo;At the very moment deeper learning matters most, it is
                  the hardest to deliver.&rdquo;
                </p>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-12 md:py-16">
          <div className="container">
            <FadeIn className="mx-auto max-w-3xl text-center">
              <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl">
                From materials to simulation in four steps.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-muted md:text-lg">
                Praxis works with what you already have: cases, slides, or
                learning goals.
              </p>
            </FadeIn>
          </div>

          <HowItWorksHorizontalScroll />

          <div className="container">
            <FadeIn className="mt-10 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex min-h-[48px] items-center justify-center"
              >
                <Button className="min-h-[48px] text-base px-10 shadow-soft">
                  Try Now!
                </Button>
              </Link>
            </FadeIn>
          </div>
        </section>

        {/* ── Impact ── */}
        <section id="impact" className="container py-12 md:py-16">
          <FadeIn className="text-center max-w-3xl mx-auto">

            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl">
              Measurable results from day one.
            </h2>
          </FadeIn>

          <div className="mt-12 grid gap-6 md:grid-cols-3 md:items-stretch">
            {impactMetrics.map((metric, i) => (
              <FadeIn key={metric.label} delay={i * 0.12} className="h-full min-h-0">
                <div
                  className={`flex h-full min-h-[280px] w-full flex-col items-center justify-center rounded-3xl p-8 text-center md:min-h-[300px] ${LANDING_TILE_BACKGROUNDS[i % 3]}`}
                >
                  <p className="text-5xl font-bold text-accent md:text-6xl">
                    <AnimatedCounter
                      target={metric.value}
                      suffix={metric.suffix}
                      isQualitative={metric.isQualitative}
                    />
                  </p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-ink">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {metric.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section id="testimonials" className="container py-12 md:py-16">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <h2 className="mt-3 text-3xl font-bold text-ink md:text-4xl">
              What educators are saying.
            </h2>
          </FadeIn>

          <div className="mt-12 grid gap-6 md:grid-cols-3 md:items-stretch">
            {testimonials.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1} className="h-full min-h-0">
                <div
                  className={`flex h-full min-h-[280px] w-full flex-col rounded-3xl p-8 text-left md:min-h-[300px] ${LANDING_TILE_BACKGROUNDS[i % 3]}`}
                >
                  <span
                    className="block w-full text-left font-serif text-6xl leading-[0.85] text-accent md:text-7xl"
                    aria-hidden
                  >
                    &ldquo;
                  </span>
                  <p className="mt-3 flex-1 text-base font-bold leading-snug text-ink md:text-lg md:leading-snug">
                    {t.quote}
                  </p>
                  <div className="mt-auto w-full pt-6">
                    <p className="text-sm font-semibold text-ink">{t.name}</p>
                    <p className="text-xs leading-snug text-muted">{t.title}</p>
                    {t.subtitle && (
                      <p className="text-xs leading-snug text-muted">
                        {t.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <FaqSection />

        {/* ── Mailing List ── */}
        <section className="container py-12 md:py-16">
          <FadeIn>
            <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accentSoft/60 via-white/90 to-accentSoft/40 p-8 md:p-12 text-center shadow-soft">
              <h2 className="text-2xl font-bold text-ink md:text-3xl">
                Stay in the loop.
              </h2>
              <p className="mt-3 text-base text-muted max-w-lg mx-auto">
                Join our mailing list for product updates, new simulation
                templates, and best practices for active learning.
              </p>
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/30 px-5 py-3 text-sm font-semibold text-accent"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  You&apos;re on the list!
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubscribe}
                  className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
                >
                  <input
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-full border border-line bg-white px-5 py-3 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-canvas"
                  />
                  <Button
                    type="submit"
                    className="w-full sm:w-auto min-h-[44px] whitespace-nowrap"
                  >
                    Join Mailing List
                  </Button>
                </form>
              )}
            </div>
          </FadeIn>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        id="contact"
        className="container scroll-mt-19 border-t border-line/60 py-10"
      >
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold text-ink"
            >
              <span className="inline-flex shrink-0 items-center justify-center rounded-sm bg-white p-0.5">
                <Image
                  src="/logo.jpg"
                  alt="Praxis"
                  width={72}
                  height={55}
                  className="h-6 w-auto"
                />
              </span>
              Praxis
            </Link>
            <p className="mt-2 text-sm text-muted">
              Classroom Decision Simulations
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-muted">
            {["About", "Privacy", "Terms", "Contact"].map((link) => (
              <a key={link} href="#" className="hover:text-ink transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
      </div>
    </ReactLenis>
  );
}
