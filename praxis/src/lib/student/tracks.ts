export type StudentTrackId =
  | "consulting"
  | "entrepreneurship"
  | "product_management"
  | "policy";

export type StudentTrack = {
  id: StudentTrackId;
  label: string;
  description: string;
  keywords: string[];
};

export const STUDENT_TRACKS: StudentTrack[] = [
  {
    id: "consulting",
    label: "Consulting",
    description: "Market entry, pricing, M&A, and turnaround decisions.",
    keywords: [
      "consult",
      "market",
      "pricing",
      "m&a",
      "merger",
      "acquisition",
      "turnaround",
      "strategy",
      "corporate",
    ],
  },
  {
    id: "entrepreneurship",
    label: "Entrepreneurship",
    description: "Fundraising, hiring, growth, and early-stage tradeoffs.",
    keywords: [
      "startup",
      "founder",
      "fundraising",
      "venture",
      "entrepreneur",
      "growth",
      "hiring",
      "seed",
    ],
  },
  {
    id: "product_management",
    label: "Product Management",
    description: "Feature prioritization, launch, stakeholder, and crisis scenarios.",
    keywords: [
      "product",
      "feature",
      "launch",
      "stakeholder",
      "roadmap",
      "user",
      "customer",
      "crisis",
    ],
  },
  {
    id: "policy",
    label: "Policy",
    description: "Public health, regulation, planning, and negotiation practice.",
    keywords: [
      "policy",
      "public",
      "health",
      "regulation",
      "environment",
      "urban",
      "planning",
      "legislative",
      "government",
    ],
  },
];

export function trackForSimulation(input: {
  title?: string | null;
  course_topic?: string | null;
}): StudentTrack {
  const haystack = `${input.title ?? ""} ${input.course_topic ?? ""}`.toLowerCase();
  return (
    STUDENT_TRACKS.find((track) =>
      track.keywords.some((keyword) => haystack.includes(keyword))
    ) ?? STUDENT_TRACKS[0]
  );
}

export function studentDifficultyLabel(difficulty: string | null | undefined): string {
  if (difficulty === "easy") return "Easy";
  if (difficulty === "challenge") return "Challenge";
  return "Hard";
}

