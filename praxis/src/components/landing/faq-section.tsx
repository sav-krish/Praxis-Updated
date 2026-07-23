"use client";

import Link from "next/link";
import { FadeIn } from "@/components/landing/fade-in";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    id: "what-do-i-get",
    question: "What do I actually get with Praxis?",
    answer:
      "You turn your materials into a live class activity. Students read a short story. They make choices at key moments. They see what happens next. At the end they answer reflection questions. You see who picked what. You see scores if you use them. You see written answers you can discuss in class. You do not have to build a brand new case every term.",
  },
  {
    id: "how-fast",
    question: "How fast can I go from zero to my first class?",
    answer:
      "Most teachers get a strong first version in a few minutes. You upload or paste your content. You create a simulation. You fix words and choices in the editor. Many people teach their first session in the same week. If you want to practice first or team teach, give yourself a little more time. You still do not start from nothing.",
  },
  {
    id: "not-technical",
    question: "I am not technical. Can I still use this?",
    answer:
      "Yes. It all runs in the web browser. You do not write code. You do not need a big IT project. You edit text and answer choices like you edit a lesson plan. AI can write a first draft. You choose what students see.",
  },
  {
    id: "student-requirements",
    question: "What do my students need to participate?",
    answer:
      "They need a device with a web browser. They need the join code or QR code you share. They type a name to enter the room. They do not need their own Praxis account. That keeps things simple for large classes.",
  },
  {
    id: "vs-case-clicker",
    question: "How is this different from a written case or clicker questions?",
    answer:
      "A written case often ends the same way no matter what the class picks. A clicker records one answer. It does not show what happens next. Praxis ties each choice to a result that students see right away. That sparks discussion. It also helps students practice skills employers want, like clear thinking, teamwork, and making decisions when the path is unclear.",
  },
  {
    id: "own-materials",
    question: "Can I use my own cases, slides, or syllabus?",
    answer:
      "Yes. You can upload PDF or Word files. You can paste notes. You can describe your goals in plain words. The activity stays tied to your course. You approve every line before students see it.",
  },
  {
    id: "ai-not-perfect",
    question: "What if the AI draft is not perfect the first time?",
    answer:
      "That is normal. That is why there is a full editor. You can change the story, the choices, what happens next, or the reflection questions in a few minutes. Treat your first run as practice. Then you will know what to fix for the next class.",
  },
  {
    id: "privacy",
    question: "What about privacy and my data?",
    answer:
      "Your account stores your simulations and class session data. We built this for real classroom use. For legal details, read Privacy and Terms in the footer when they are posted. If your school needs a data review, contact us the same way you contact other software vendors.",
  },
  {
    id: "lms",
    question: "Does Praxis work with Canvas or my LMS?",
    answer:
      "Praxis runs in the web browser. Post the join link or code in Canvas, Blackboard, Moodle, or email. Use the tools you already use. Grades do not sync automatically yet. Export results when you need to enter scores in your grade book.",
  },
  {
    id: "pricing",
    question: "What does it cost, and can I try it before I commit?",
  },
] satisfies ReadonlyArray<{
  id: string;
  question: string;
  answer?: string;
}>;

export function FaqSection() {
  return (
    <section id="faq" className="container scroll-mt-19 py-12 md:py-16">
      <FadeIn className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-ink md:text-4xl">
          Common questions
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted md:text-lg">
          Simple answers about what you get, how long it takes, and what you
          need to do.
        </p>
      </FadeIn>

      <FadeIn className="mx-auto mt-10 max-w-3xl" delay={0.08}>
        <div className="praxis-light-surface rounded-2xl border border-[#d8a986] bg-[#fff7ef]/95 px-4 py-2 shadow-subtle backdrop-blur-sm md:px-6 md:py-3">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-[#a93d07] hover:text-[#7d2d05]">{item.question}</AccordionTrigger>
                <AccordionContent className="text-[#4a1f10]">
                  {item.answer ? (
                    <p>{item.answer}</p>
                  ) : (
                    <p>
                      You can start with a free account. You can build
                      simulations, run live classes, and view reports. When you
                      need more, paid plans add more room. For example, Pro
                      includes unlimited simulations. After you sign in, open{" "}
                      <Link
                        href="/pricing"
                        className="font-semibold text-accent underline-offset-2 hover:underline"
                      >
                        Pricing
                      </Link>{" "}
                      in the app for current prices, or{" "}
                      <Link
                        href="/signup"
                        className="font-semibold text-accent underline-offset-2 hover:underline"
                      >
                        get started free
                      </Link>
                      .
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </FadeIn>
    </section>
  );
}
