/**
 * Remove all showcase seed Auth users (and related public data).
 *
 * Run: pnpm seed:showcase:delete (from repo root or praxis/)
 *
 * Deletes in two phases so Postgres/Supabase cascades and favorite_count triggers
 * do not fight auth.users deletion:
 *   1) Likers — simulation_favorites, subscriptions, then auth user
 *   2) Authors — simulations (cascades session tree), subscriptions, then auth user
 *
 * Keep AUTHOR_EMAILS / LIKER_EMAILS in sync with seed-showcase-library.mjs.
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

const AUTHOR_EMAILS = [
  "showcase-author-01@example.com",
  "showcase-author-02@example.com",
  "showcase-author-03@example.com",
  "showcase-author-04@example.com",
  "showcase-author-05@example.com",
  "showcase-author-06@example.com",
  "showcase-author-07@example.com",
];

const LIKER_EMAILS = [
  "showcase-liker-01@example.com",
  "showcase-liker-02@example.com",
  "showcase-liker-03@example.com",
  "showcase-liker-04@example.com",
  "showcase-liker-05@example.com",
  "showcase-liker-06@example.com",
  "showcase-liker-07@example.com",
  "showcase-liker-08@example.com",
  "showcase-liker-09@example.com",
  "showcase-liker-10@example.com",
];

function logAuthError(email, error) {
  const msg = error?.message ?? String(error);
  const extra = error?.code ? ` [${error.code}]` : "";
  console.error(`  Failed ${email}:${extra} ${msg}`);
  if (error && typeof error === "object" && process.env.DEBUG_SHOWCASE_DELETE) {
    console.error(JSON.stringify(error, null, 2));
  }
}

async function deleteUserPublicRows(userId) {
  const tasks = [
    supabase.from("simulation_favorites").delete().eq("user_id", userId),
    supabase.from("subscriptions").delete().eq("user_id", userId),
    supabase.from("feedback").delete().eq("user_id", userId),
  ];
  for (const { error } of await Promise.all(tasks)) {
    if (
      error &&
      !/relation|does not exist|schema cache/i.test(error.message ?? "")
    ) {
      console.warn(`  (cleanup warning) ${error.message}`);
    }
  }
}

async function deleteAuthUser(email, userId) {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    logAuthError(email, error);
    return false;
  }
  console.log(`  Deleted: ${email}`);
  return true;
}

async function main() {
  console.log("Deleting showcase users (two-phase cleanup)…\n");

  const allEmails = [...LIKER_EMAILS, ...AUTHOR_EMAILS];
  const { data: profs, error: qErr } = await supabase
    .from("professors")
    .select("id, email")
    .in("email", allEmails);

  if (qErr) throw qErr;

  const byEmail = new Map((profs ?? []).map((p) => [p.email, p.id]));

  console.log("Phase 1 — likers (favorites + subscriptions, then auth)\n");
  for (const email of LIKER_EMAILS) {
    const userId = byEmail.get(email);
    if (!userId) {
      console.log(`  Skip (no professor row): ${email}`);
      continue;
    }
    await deleteUserPublicRows(userId);
    await deleteAuthUser(email, userId);
  }

  console.log("\nPhase 2 — authors (simulations cascade, then auth)\n");
  for (const email of AUTHOR_EMAILS) {
    const userId = byEmail.get(email);
    if (!userId) {
      console.log(`  Skip (no professor row): ${email}`);
      continue;
    }
    const { error: simErr } = await supabase
      .from("simulations")
      .delete()
      .eq("professor_id", userId);
    if (simErr && !/relation|does not exist/i.test(simErr.message ?? "")) {
      console.warn(`  Simulations delete ${email}: ${simErr.message}`);
    }
    await deleteUserPublicRows(userId);
    await deleteAuthUser(email, userId);
  }

  console.log(
    "\nDone. Orphan auth users (no professor row): remove in Supabase Dashboard → Authentication."
  );
  console.log(
    "Legacy rows titled with [Showcase]… owned by other accounts: delete in Table Editor or SQL if needed."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
