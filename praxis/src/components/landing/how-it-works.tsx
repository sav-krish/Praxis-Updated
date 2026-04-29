"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { Wand2, PenLine } from "lucide-react";
import { FadeIn } from "@/components/landing/fade-in";

const steps = [
  {
    num: 1,
    title: "Browse or Upload",
    body: "Explore the simulation library for ready-made scenarios, or upload your own case, slides, or learning goals.",
  },
  {
    num: 2,
    title: "Make It Yours",
    body: "Edit the scenario, decisions, options, and scoring. Add data blocks, hidden roles, and reflection questions.",
    accent: true,
  },
  {
    num: 3,
    title: "Students Join Instantly",
    body: "Share a QR code or join link. Students scan, enter their name, and they're in with no accounts required.",
  },
  {
    num: 4,
    title: "Debrief with Real Data",
    body: "After the session, review choice distributions, scores, and reflection responses in a structured post-session report.",
  },
] as const;

const howItWorksStepOneScreens = [
  {
    src: "/library.png",
    width: 2122,
    height: 1126,
    alt: "Browse the simulation library for ready-made scenarios",
  },
  {
    src: "/new_simulation.png",
    width: 1466,
    height: 1140,
    alt: "Create or upload a new simulation",
  },
] as const;

const howItWorksStepTwoScreens = [
  {
    src: "/decision.png",
    width: 1562,
    height: 656,
    alt: "Edit simulation decisions: structure choices and options for students",
  },
  {
    src: "/data.png",
    width: 1138,
    height: 1090,
    alt: "Add data blocks and visuals such as tables and charts to the simulation",
  },
] as const;

const howItWorksStepThreeScreens = [
  {
    src: "/lobby.png",
    width: 2268,
    height: 1056,
    alt: "Session lobby with join code, QR code, and participant list",
  },
  {
    src: "/student.png",
    width: 1400,
    height: 1210,
    alt: "Student view while taking the simulation: decisions and submit flow",
  },
] as const;

const howItWorksStepFourScreens = [
  {
    src: "/results.png",
    width: 2060,
    height: 1094,
    alt: "Post-session results: response distribution, scores, and debrief tabs",
  },
] as const;

const howItWorksStepMasterBackgrounds = [
  "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)",
  "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(to top, #accbee 0%, #e7f0fd 100%)",
  "linear-gradient(-225deg, #5D9FFF 0%, #B8DCFF 48%, #6BBBFF 100%)",
] as const;

/** Responsive width hints for next/image inside the card (max frame ~64rem; dual panes ~half each on sm+). */
const HOW_IT_WORKS_IMAGE_SIZES_SINGLE =
  "(max-width: 640px) min(calc(100vw - 2.5rem), 64rem), min(64rem, calc(100vw - 3rem))";
const HOW_IT_WORKS_IMAGE_SIZES_MULTI =
  "(max-width: 640px) min(calc(100vw - 2.5rem), 64rem), (max-width: 1024px) min(calc(50vw - 2rem), 32rem), min(36rem, 45vw)";

function subscribePrefersReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getPrefersReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    () => false
  );
}

type HowItWorksScreenAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

function HowItWorksCard({
  screens,
  masterBackground,
  createButtonsOverlaySrc,
}: {
  screens: readonly HowItWorksScreenAsset[];
  masterBackground: string;
  createButtonsOverlaySrc?: string;
}) {
  const single = screens.length === 1;
  const sizes = single
    ? HOW_IT_WORKS_IMAGE_SIZES_SINGLE
    : HOW_IT_WORKS_IMAGE_SIZES_MULTI;

  const frameStyle = { backgroundImage: masterBackground };

  const screenshotRadius = "overflow-hidden rounded-xl sm:rounded-2xl";
  const screenshotShadow =
    "shadow-[0_26px_55px_-14px_rgba(15,36,71,0.28),0_12px_28px_-10px_rgba(15,36,71,0.14)]";
  /** Dual panes only: needs a positioning context for the create-flow overlay. */
  const screenshotShell = `relative flex items-center justify-center ${screenshotRadius} ${screenshotShadow}`;

  return (
    <div
      className={
        single
          ? "mx-auto flex w-full max-w-[64rem] flex-col items-center justify-center overflow-hidden rounded-3xl p-3 shadow-[0_20px_50px_-20px_rgba(15,36,71,0.18)] ring-1 ring-white/50 sm:p-4 md:p-6 lg:p-8 relative min-h-[250px]"
          : "mx-auto flex w-full max-w-[64rem] flex-col items-center justify-center overflow-hidden rounded-3xl p-3 shadow-[0_20px_50px_-20px_rgba(15,36,71,0.18)] ring-1 ring-white/50 sm:p-4 md:p-6 lg:p-8 relative aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] max-h-[50vh] min-h-[250px] md:max-h-[60vh] lg:max-h-[70vh]"
      }
      style={frameStyle}
    >
      <div
        className={
          single
            ? "flex w-full items-center justify-center px-5 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6"
            : "flex h-full w-full flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 md:gap-6 p-2"
        }
      >
        {screens.map((img) => {
          const isOverlayTarget = img.src === createButtonsOverlaySrc;

          if (single) {
            return (
              <Image
                key={img.src}
                src={img.src}
                width={img.width}
                height={img.height}
                alt={img.alt}
                sizes={sizes}
                className={`mx-auto block h-auto w-auto max-w-[min(100%,52rem)] object-contain max-h-[min(58svh,36rem)] sm:max-h-[min(52svh,34rem)] md:max-h-[min(48svh,32rem)] ${screenshotRadius} ${screenshotShadow}`}
                draggable={false}
              />
            );
          }

          return (
            <div
              key={img.src}
              className={`${screenshotShell} max-h-[45%] max-w-full shrink sm:max-h-full sm:max-w-[48%]`}
            >
              <Image
                src={img.src}
                width={img.width}
                height={img.height}
                alt={img.alt}
                sizes={sizes}
                className="block h-auto w-auto max-h-full max-w-full object-contain"
                draggable={false}
              />

              {isOverlayTarget && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-white/95 from-20% via-white/70 to-transparent px-3 pb-3 pt-12 sm:px-4 sm:pb-4 sm:pt-16"
                  aria-hidden="true"
                >
                  <div className="w-full max-w-[22rem] sm:max-w-[28rem] select-none mx-auto mt-auto">
                    <div className="flex min-w-0 flex-row gap-1.5 sm:gap-2.5">
                      <div className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-md border-0 bg-[linear-gradient(to_right,#a855f7_0%,#6366f1_50%,#06b6d4_100%)] px-1.5 text-[10px] font-semibold leading-none tracking-tight text-white shadow-md whitespace-nowrap sm:min-h-[40px] sm:gap-1.5 sm:rounded-lg sm:px-2 sm:text-[11px] md:text-xs">
                        <Wand2 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                        Generate with AI
                      </div>
                      <div className="flex min-h-[36px] flex-1 items-center justify-center gap-1 rounded-md border-[1.5px] border-slate-200 bg-white/95 px-1.5 text-[10px] font-semibold leading-none tracking-tight text-slate-800 shadow-md backdrop-blur-sm whitespace-nowrap sm:min-h-[40px] sm:gap-1.5 sm:rounded-lg sm:px-2 sm:text-[11px] md:text-xs">
                        <PenLine className="h-3 w-3 shrink-0 text-slate-600 sm:h-3.5 sm:w-3.5" />
                        Create Manually
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepCard({ stepNum }: { stepNum: number }) {
  switch (stepNum) {
    case 1:
      return (
        <HowItWorksCard
          screens={howItWorksStepOneScreens}
          masterBackground={howItWorksStepMasterBackgrounds[0]}
          createButtonsOverlaySrc="/new_simulation.png"
        />
      );
    case 2:
      return (
        <HowItWorksCard
          screens={howItWorksStepTwoScreens}
          masterBackground={howItWorksStepMasterBackgrounds[1]}
        />
      );
    case 3:
      return (
        <HowItWorksCard
          screens={howItWorksStepThreeScreens}
          masterBackground={howItWorksStepMasterBackgrounds[2]}
        />
      );
    case 4:
      return (
        <HowItWorksCard
          screens={howItWorksStepFourScreens}
          masterBackground={howItWorksStepMasterBackgrounds[3]}
        />
      );
    default:
      return null;
  }
}

const stepCount = steps.length;

export function HowItWorksHorizontalScroll() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const ulRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion) return;
    const ul = ulRef.current;
    if (ul) ul.style.transform = "translateX(0px)";
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const section = railRef.current;
    const ul = ulRef.current;
    if (!section || !ul) return;

    const maxTranslate = (stepCount - 1) * window.innerWidth;
    let frameId = 0;

    const updateTransform = () => {
      const rect = section.getBoundingClientRect();
      const scrollRange = Math.max(section.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(-rect.top / scrollRange, 0), 1);
      ul.style.transform = `translateX(-${progress * maxTranslate}px)`;
      frameId = 0;
    };

    const requestUpdate = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(updateTransform);
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div className="mx-auto mt-8 max-w-5xl space-y-8 px-6 sm:mt-12">
        {steps.map((step, index) => (
          <FadeIn key={step.num} delay={index * 0.08}>
            <div className="space-y-4 text-center">
              <StepCard stepNum={step.num} />
              <h3 className="text-base font-semibold text-ink md:text-lg">
                <span className="sr-only">
                  Step {step.num} of {stepCount}:{" "}
                </span>
                {step.title}
              </h3>
              <p className="mx-auto max-w-prose text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={railRef}
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mt-8 w-screen max-w-[100vw] overflow-x-clip sm:mt-12"
      style={{ height: `${stepCount * 100}dvh` }}
      aria-label="How Praxis works, step by step"
    >
      <ul
        id="how-it-works-scroll-strip"
        ref={ulRef}
        className="sticky top-0 flex h-dvh w-max shrink-0 will-change-transform"
      >
        {steps.map((step) => (
          <li
            key={step.num}
            className="box-border flex h-dvh w-screen shrink-0 flex-col items-center justify-center gap-6 sm:gap-8 lg:gap-12"
            style={{
              paddingLeft: "1.5rem",
              paddingRight: "1.5rem",
              paddingBottom: "1.5rem",
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 5rem)",
            }}
          >
            <div className="flex w-full min-h-0 justify-center">
              <div
                className="w-full flex justify-center"
                style={{ maxHeight: "100%" }}
              >
                <StepCard stepNum={step.num} />
              </div>
            </div>

            <div className="mx-auto w-full max-w-2xl shrink-0 space-y-1.5 px-4 text-center sm:space-y-2">
              <h3 className="text-base font-semibold text-ink sm:text-lg md:text-xl lg:text-2xl">
                <span className="sr-only">
                  Step {step.num} of {stepCount}:{" "}
                </span>
                {step.title}
              </h3>
              <p className="mx-auto max-w-prose text-sm leading-relaxed text-muted md:text-base">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
