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
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Hand-authored simulation graphs (background, decisions, options, reflection
 * questions, data blocks) live in a sibling JSON so this script stays small.
 */
const SEED_SIMULATIONS_JSON = resolve(
  __dirname,
  "data/seed-simulations.json"
);
const SEED_SIMULATIONS_GRAPH = JSON.parse(
  readFileSync(SEED_SIMULATIONS_JSON, "utf8")
);

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
 * Hand-authored sims with full graphs. Pulled from data/seed-simulations.json
 * so the catalog stays reviewable. authorEmail must match AUTHORS[].email and
 * titles stay unique per author so re-runs are idempotent.
 */
const SIMULATION_SPECS = SEED_SIMULATIONS_GRAPH.map((sim) => ({
  authorEmail: sim.authorEmail,
  title: sim.title,
  course_topic: sim.course_topic,
  difficulty: sim.difficulty,
  estimated_minutes: sim.estimated_minutes,
  goal: sim.goal,
  background_content: sim.background_content,
  decisions: sim.decisions,
  reflectionQuestions: sim.reflectionQuestions,
  dataBlocks: sim.dataBlocks,
}));

/**
 * Favorite plan: distribute likes across the 8 sims so the library has visible
 * 'top picks' but every sim still has at least a few.
 */
const FAVORITE_PLAN = [
  { simulationTitle: SIMULATION_SPECS[0].title, likerEmails: LIKERS.map((l) => l.email) },
  { simulationTitle: SIMULATION_SPECS[1].title, likerEmails: LIKERS.slice(0, 9).map((l) => l.email) },
  { simulationTitle: SIMULATION_SPECS[2].title, likerEmails: LIKERS.slice(0, 8).map((l) => l.email) },
  { simulationTitle: SIMULATION_SPECS[3].title, likerEmails: LIKERS.slice(0, 6).map((l) => l.email) },
  { simulationTitle: SIMULATION_SPECS[4].title, likerEmails: LIKERS.slice(0, 5).map((l) => l.email) },
  { simulationTitle: SIMULATION_SPECS[5].title, likerEmails: LIKERS.slice(0, 4).map((l) => l.email) },
  { simulationTitle: SIMULATION_SPECS[6].title, likerEmails: LIKERS.slice(0, 3).map((l) => l.email) },
  { simulationTitle: SIMULATION_SPECS[7].title, likerEmails: LIKERS.slice(0, 2).map((l) => l.email) },
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

/**
 * Insert the 3 decisions + 9 options for a simulation. Idempotent: skips
 * decisions whose order_num already exists for that simulation.
 *
 * UPSERT is avoided because the unique key on (simulation_id, order_num)
 * doesn't carry the option's `label` so we'd risk duplicating options.
 */
async function ensureDecisions(simulationId, decisions) {
  const { data: existing, error } = await supabase
    .from("decisions")
    .select("id, order_num")
    .eq("simulation_id", simulationId);
  if (error) throw error;
  const existingByOrder = new Map(
    (existing ?? []).map((d) => [d.order_num, d.id])
  );

  for (let i = 0; i < decisions.length; i++) {
    const orderNum = i + 1;
    if (existingByOrder.has(orderNum)) {
      console.log(`    Decision ${orderNum} exists, skipping.`);
      continue;
    }
    const dec = decisions[i];
    const { data: insertedDec, error: decErr } = await supabase
      .from("decisions")
      .insert({
        simulation_id: simulationId,
        order_num: orderNum,
        prompt: dec.prompt,
      })
      .select("id")
      .single();
    if (decErr) throw decErr;

    const optionRows = (dec.options ?? []).map((opt) => ({
      decision_id: insertedDec.id,
      label: opt.label,
      title: opt.title,
      description: opt.description ?? null,
      consequence: opt.consequence ?? null,
      score: opt.score ?? 1,
    }));
    if (optionRows.length > 0) {
      const { error: optErr } = await supabase.from("options").insert(optionRows);
      if (optErr) throw optErr;
    }
    console.log(
      `    Inserted decision ${orderNum} (+${optionRows.length} options).`
    );
  }
}

/**
 * Insert reflection questions (max 2, by `order_num`). Skips questions whose
 * order_num is already present for the simulation.
 */
async function ensureReflectionQuestions(simulationId, questions) {
  if (!Array.isArray(questions) || questions.length === 0) return;
  const { data: existing, error } = await supabase
    .from("reflection_questions")
    .select("order_num")
    .eq("simulation_id", simulationId);
  if (error) throw error;
  const existingOrders = new Set((existing ?? []).map((q) => q.order_num));

  const rows = questions
    .slice(0, 2)
    .map((q, i) => ({
      simulation_id: simulationId,
      order_num: i + 1,
      question: q,
    }))
    .filter((r) => !existingOrders.has(r.order_num));

  if (rows.length === 0) {
    console.log(`    Reflection questions exist, skipping.`);
    return;
  }
  const { error: insErr } = await supabase
    .from("reflection_questions")
    .insert(rows);
  if (insErr) throw insErr;
  console.log(`    Inserted ${rows.length} reflection question(s).`);
}

/**
 * Insert simulation_data_blocks. Skips by order_num (unique on simulation_id+order_num).
 */
async function ensureDataBlocks(simulationId, blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return;
  const { data: existing, error } = await supabase
    .from("simulation_data_blocks")
    .select("order_num")
    .eq("simulation_id", simulationId);
  if (error) throw error;
  const existingOrders = new Set((existing ?? []).map((b) => b.order_num));

  const rows = blocks
    .map((b, i) => ({
      simulation_id: simulationId,
      order_num: i + 1,
      block_type: b.block_type,
      title: b.title ?? null,
      data: b.data,
    }))
    .filter((r) => !existingOrders.has(r.order_num));

  if (rows.length === 0) {
    console.log(`    Data blocks exist, skipping.`);
    return;
  }
  const { error: insErr } = await supabase
    .from("simulation_data_blocks")
    .insert(rows);
  if (insErr) throw insErr;
  console.log(`    Inserted ${rows.length} data block(s).`);
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

    // Children: decisions + options, reflection questions, data blocks.
    await ensureDecisions(id, spec.decisions ?? []);
    await ensureReflectionQuestions(id, spec.reflectionQuestions ?? []);
    await ensureDataBlocks(id, spec.dataBlocks ?? []);
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
