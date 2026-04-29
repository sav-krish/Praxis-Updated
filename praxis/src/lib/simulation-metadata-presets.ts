/**
 * Single source of truth for Create-page “preference” tags and labels.
 * Used by bulk metadata inference so tagging matches the UI exactly.
 */
export const SIMULATION_STYLE_OPTIONS = [
  "Case Study",
  "Role Play",
  "Crisis Management",
  "Negotiation",
  "Ethical Dilemma",
  "Strategic Planning",
] as const;

export const SIMULATION_INTERACTION_OPTIONS = [
  "Individual Reflection",
  "Group Discussion",
  "Debate",
  "Peer Review",
] as const;

export const SIMULATION_FOCUS_OPTIONS = [
  "Data-Driven",
  "Narrative-Heavy",
  "Visual/Charts",
  "Timeline-Based",
] as const;

export const SIMULATION_ASSESSMENT_OPTIONS = [
  "Clear Right/Wrong",
  "Nuanced Tradeoffs",
  "No Correct Answer",
] as const;

export const PREFERENCE_CATEGORIES = {
  style: {
    label: "Simulation Style",
    options: [...SIMULATION_STYLE_OPTIONS],
  },
  interaction: {
    label: "Student Interaction",
    options: [...SIMULATION_INTERACTION_OPTIONS],
  },
  focus: {
    label: "Content Focus",
    options: [...SIMULATION_FOCUS_OPTIONS],
  },
  assessment: {
    label: "Assessment Style",
    options: [...SIMULATION_ASSESSMENT_OPTIONS],
  },
} as const;
