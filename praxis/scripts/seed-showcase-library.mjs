/**
 * Seed public library simulations for screenshots / demos.
 *
 * Requirements (in .env.local or environment):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
 *
 * Run from the `praxis/` directory:
 *   node --env-file=.env.local scripts/seed-showcase-library.mjs
 *
 * Or: pnpm seed:showcase
 *
 * Removes prior seed: pnpm seed:showcase:delete
 *
 * Creates Auth users + professors (display names on professors → "by First Last" in library),
 * public simulations, and simulation_favorites (triggers maintain favorite_count).
 *
 * Idempotent: re-running skips existing users/simulations by email/title; favorites ignore duplicates.
 *
 * To wipe and re-seed: run delete-showcase-library.mjs first, then this script.
 */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
  );
  process.exit(1);
}

const supabase = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Shared password for all showcase accounts (change if your project enforces stricter rules). */
const SHOWCASE_PASSWORD = "ShowcaseLibrary!seed2026";

const AUTHORS = [
  { email: "showcase-author-01@example.com", displayName: "Adam Marco" },
  { email: "showcase-author-02@example.com", displayName: "Elena Vasquez" },
  { email: "showcase-author-03@example.com", displayName: "Marcus Nguyen" },
  { email: "showcase-author-04@example.com", displayName: "Rachel Stein" },
  { email: "showcase-author-05@example.com", displayName: "Diego Morales" },
  { email: "showcase-author-06@example.com", displayName: "Hannah Brooks" },
  { email: "showcase-author-07@example.com", displayName: "Priya Shah" },
];

const LIKERS = [
  { email: "showcase-liker-01@example.com", displayName: "Jordan Lee" },
  { email: "showcase-liker-02@example.com", displayName: "Sam Rivera" },
  { email: "showcase-liker-03@example.com", displayName: "Casey Morgan" },
  { email: "showcase-liker-04@example.com", displayName: "Riley Park" },
  { email: "showcase-liker-05@example.com", displayName: "Quinn Foster" },
  { email: "showcase-liker-06@example.com", displayName: "Alex Ortiz" },
  { email: "showcase-liker-07@example.com", displayName: "Taylor Kim" },
  { email: "showcase-liker-08@example.com", displayName: "Morgan Patel" },
  { email: "showcase-liker-09@example.com", displayName: "Jamie Walsh" },
  { email: "showcase-liker-10@example.com", displayName: "Reese Okonkwo" },
];

/**
 * authorEmail must match AUTHORS[].email — titles must stay unique per author for idempotency.
 * course_topic values match src/lib/subjects.ts (Subject selector).
 */
const SIMULATION_SPECS = [
  {
    authorEmail: "showcase-author-01@example.com",
    title: "Surgical supply triage across a three-hospital system",
    course_topic: "Healthcare Management",
    difficulty: "challenge",
    estimated_minutes: 40,
    goal: "Balance OR schedules, vendor alternatives, and patient safety when a critical supplier fails.",
    background_content:
      "A regional health system shares one central sterile-processing partner; a contamination scare forces same-day rationing across campuses.",
  },
  {
    authorEmail: "showcase-author-02@example.com",
    title: "Piloting an AI resume screener in career services",
    course_topic: "Human Resources",
    difficulty: "easy",
    estimated_minutes: 15,
    goal: "Decide how far to go with automation before peak recruiting season.",
    background_content:
      "Career services wants faster employer matching; student advocates and legal counsel disagree on bias testing and opt-out rules.",
  },
  {
    authorEmail: "showcase-author-03@example.com",
    title: "Runway vs. vertical: where should this SaaS place its next bet?",
    course_topic: "Entrepreneurship",
    difficulty: "hard",
    estimated_minutes: 25,
    goal: "Choose between deepening the core ICP or opening a second vertical with limited engineering capacity.",
    background_content:
      "Eighteen months of runway, one flagship customer cohort growing fast, and a board slide that shows two incompatible growth curves.",
  },
  {
    authorEmail: "showcase-author-04@example.com",
    title: "Transit strike countdown: shaping the last-best-offer package",
    course_topic: "Public Administration",
    difficulty: "challenge",
    estimated_minutes: 40,
    goal: "Thread elected officials, riders, and union priorities before a binding arbitration window closes.",
    background_content:
      "A mid-size city’s transit authority faces a mandatory cooling-off period ending in fourteen days; media is already running rider polls.",
  },
  {
    authorEmail: "showcase-author-05@example.com",
    title: "First climate disclosure on the eve of the earnings call",
    course_topic: "Environmental Policy",
    difficulty: "easy",
    estimated_minutes: 15,
    goal: "Pick what ships in the inaugural disclosure vs. what waits for the next cycle.",
    background_content:
      "A manufacturer’s first TCFD-style appendix is due the night before Q3 guidance; the CFO wants one clear narrative for analysts.",
  },
  {
    authorEmail: "showcase-author-06@example.com",
    title: "Consumer recall: sequencing legal, comms, and retail partners",
    course_topic: "Marketing",
    difficulty: "hard",
    estimated_minutes: 25,
    goal: "Order external statements and channel holds when a SKU may have a battery fault.",
    background_content:
      "Big-box partners are asking for talking points before your lab sign-off; legal wants no admission of defect until tests complete.",
  },
  {
    authorEmail: "showcase-author-07@example.com",
    title: "Mid-year scholarship cuts across faculty committees",
    course_topic: "Education",
    difficulty: "hard",
    estimated_minutes: 25,
    goal: "Allocate a reduced pool while satisfying donor restrictions and access goals.",
    background_content:
      "Central admin cut discretionary awards by twenty percent after the census; each college submitted incompatible priority lists.",
  },
];

/** Top sim gets 10 likes, then 8, 6, 4, 2; remaining sims have no seeded favorites. */
const FAVORITE_PLAN = [
  {
    simulationTitle: "Surgical supply triage across a three-hospital system",
    likerEmails: LIKERS.map((l) => l.email),
  },
  {
    simulationTitle: "Piloting an AI resume screener in career services",
    likerEmails: LIKERS.slice(0, 8).map((l) => l.email),
  },
  {
    simulationTitle: "Runway vs. vertical: where should this SaaS place its next bet?",
    likerEmails: LIKERS.slice(0, 6).map((l) => l.email),
  },
  {
    simulationTitle: "Transit strike countdown: shaping the last-best-offer package",
    likerEmails: LIKERS.slice(0, 4).map((l) => l.email),
  },
  {
    simulationTitle: "First climate disclosure on the eve of the earnings call",
    likerEmails: LIKERS.slice(0, 2).map((l) => l.email),
  },
];

async function ensureUser(email, password, displayName) {
  const { data: existing } = await supabase
    .from("professors")
    .select("id, name")
    .eq("email", email)
    .maybeSingle();

  if (existing?.id) {
    if (displayName && String(existing.name ?? "").trim() !== displayName.trim()) {
      await supabase
        .from("professors")
        .update({ name: displayName })
        .eq("id", existing.id);
      await supabase.auth.admin.updateUserById(existing.id, {
        user_metadata: { name: displayName },
      });
    }
    console.log(`  User exists: ${email} → ${existing.id}`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: displayName },
  });

  if (error) {
    const msg = error.message ?? "";
    if (/already|registered|exists/i.test(msg)) {
      const { data: p2 } = await supabase
        .from("professors")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (p2?.id) {
        console.log(`  User already registered, linked professor: ${email}`);
        return p2.id;
      }
    }
    throw error;
  }

  console.log(`  Created user: ${email} → ${data.user.id}`);
  return data.user.id;
}

async function ensureSimulation(spec, professorId) {
  const { data: found } = await supabase
    .from("simulations")
    .select("id, favorite_count")
    .eq("professor_id", professorId)
    .eq("title", spec.title)
    .maybeSingle();

  if (found?.id) {
    console.log(`  Simulation exists: ${spec.title.slice(0, 50)}…`);
    return found.id;
  }

  const { data, error } = await supabase
    .from("simulations")
    .insert({
      professor_id: professorId,
      title: spec.title,
      course_topic: spec.course_topic,
      difficulty: spec.difficulty,
      estimated_minutes: spec.estimated_minutes,
      goal: spec.goal ?? null,
      background_content: spec.background_content ?? null,
      is_public: true,
      status: "published",
      mode: "individual",
    })
    .select("id")
    .single();

  if (error) throw error;
  console.log(`  Inserted simulation: ${spec.title.slice(0, 50)}…`);
  return data.id;
}

async function ensureFavorite(simulationId, userId) {
  const { error } = await supabase.from("simulation_favorites").insert({
    simulation_id: simulationId,
    user_id: userId,
  });
  if (!error) return;
  if (error.code === "23505" || /duplicate/i.test(error.message ?? "")) {
    return;
  }
  throw error;
}

async function main() {
  console.log("Showcase library seed — starting\n");

  const authorIdByEmail = {};
  for (const a of AUTHORS) {
    console.log(`Author: ${a.email}`);
    authorIdByEmail[a.email] = await ensureUser(
      a.email,
      SHOWCASE_PASSWORD,
      a.displayName
    );
  }

  console.log("\nLikers:");
  const likerIdByEmail = {};
  for (const l of LIKERS) {
    console.log(`Liker: ${l.email}`);
    likerIdByEmail[l.email] = await ensureUser(
      l.email,
      SHOWCASE_PASSWORD,
      l.displayName
    );
  }

  console.log("\nSimulations:");
  const simulationIdByTitle = {};
  for (const spec of SIMULATION_SPECS) {
    const profId = authorIdByEmail[spec.authorEmail];
    if (!profId) throw new Error(`Missing professor for ${spec.authorEmail}`);
    const id = await ensureSimulation(spec, profId);
    simulationIdByTitle[spec.title] = id;
  }

  console.log("\nFavorites (triggers update favorite_count):");
  for (const plan of FAVORITE_PLAN) {
    const simId = simulationIdByTitle[plan.simulationTitle];
    if (!simId) {
      console.warn(`  Skip favorites: unknown title ${plan.simulationTitle}`);
      continue;
    }
    for (const le of plan.likerEmails) {
      const uid = likerIdByEmail[le];
      if (!uid) continue;
      await ensureFavorite(simId, uid);
      console.log(`  ${plan.simulationTitle.slice(0, 40)}… ← ${le}`);
    }
  }

  console.log("\nDone. Open /library while signed in to verify Top Picks and author names.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
