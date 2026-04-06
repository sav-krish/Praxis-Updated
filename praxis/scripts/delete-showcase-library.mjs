/**
 * Remove all showcase seed Auth users (and cascaded professors, simulations, favorites).
 *
 * Run from `praxis/` after `pnpm seed:showcase:delete`
 *   node --env-file=.env.local scripts/delete-showcase-library.mjs
 *
 * Keep this email list in sync with seed-showcase-library.mjs (AUTHORS + LIKERS).
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

/** Must match showcase-author-*.com and showcase-liker-*.com in seed-showcase-library.mjs */
const SHOWCASE_EMAILS = [
  "showcase-author-01@example.com",
  "showcase-author-02@example.com",
  "showcase-author-03@example.com",
  "showcase-author-04@example.com",
  "showcase-author-05@example.com",
  "showcase-author-06@example.com",
  "showcase-author-07@example.com",
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

async function main() {
  console.log("Deleting showcase users (cascade removes their data)…\n");

  const { data: profs, error: qErr } = await supabase
    .from("professors")
    .select("id, email")
    .in("email", SHOWCASE_EMAILS);

  if (qErr) throw qErr;

  const found = profs ?? [];
  if (found.length === 0) {
    console.log("No matching professor rows for showcase emails.");
  }

  for (const email of SHOWCASE_EMAILS) {
    const row = found.find((p) => p.email === email);
    const userId = row?.id;
    if (!userId) {
      console.log(`  Skip (no professor row): ${email}`);
      continue;
    }
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.error(`  Failed ${email}:`, error.message);
    } else {
      console.log(`  Deleted: ${email}`);
    }
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
