export const SUBJECT_CATEGORIES = [
  {
    category: "Business & Management",
    subjects: [
      "Accounting",
      "Business Ethics and Corporate Social Responsibility",
      "Diversity, Equality and Inclusion",
      "Entrepreneurship",
      "Finance",
      "General Business & Management",
      "Human Resource Management",
      "Information & Knowledge Management",
      "International Business & Management",
      "Leadership",
      "Marketing",
      "Operations Management",
      "Organizational Behavior",
      "Organization Studies",
      "Sales",
      "Strategy & Consulting",
      "Supply Chain",
    ],
  },
  {
    category: "AP / High School",
    subjects: [
      "AP Environmental Science",
      "AP US Government & Politics",
      "AP US History",
    ],
  },
  {
    category: "Law & Policy",
    subjects: [
      "Constitutional Law", "Corporate Law", "Criminal Justice",
      "Environmental Policy", "Healthcare Policy", "International Law",
      "Public Administration", "Public Policy",
    ],
  },
  {
    category: "Health & Medicine",
    subjects: [
      "Clinical Ethics", "Healthcare Management", "Medicine",
      "Nursing", "Pharmacy", "Public Health", "Social Work",
    ],
  },
  {
    category: "Social Sciences",
    subjects: [
      "Anthropology", "Communications", "Economics", "Education",
      "Geography", "Political Science", "Psychology", "Sociology",
    ],
  },
  {
    category: "STEM",
    subjects: [
      "Biology", "Chemistry", "Computer Science", "Data Science",
      "Engineering", "Environmental Science", "Mathematics", "Physics",
    ],
  },
  {
    category: "Humanities & Arts",
    subjects: [
      "Architecture", "Art & Design", "English & Literature",
      "History", "Journalism", "Media Studies", "Philosophy",
    ],
  },
  {
    category: "Other",
    subjects: ["Other / Custom"],
  },
] as const;

export const ALL_SUBJECTS = SUBJECT_CATEGORIES.flatMap((c) => c.subjects);
