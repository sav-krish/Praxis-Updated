# Google sign-in setup

Deployment target: **praxis-alpha-eight** at
**https://praxis-alpha-eight-beige.vercel.app**, linked by the repository root
`.vercel/project.json`. The nested `praxis/.vercel` link points to the main
`praxis` project. Do not deploy from that nested project link for this change.

1. Verify the secondary Vercel project's production Supabase URL. Apply
   `supabase/migrations/20260926_google_student_signup.sql` to that database
   before enabling Google. It changes only new-account creation: Google accounts
   receive student profiles; email/password role selection and existing accounts
   are preserved. If both sites share this database, this trigger change applies
   to new Google accounts on both sites (it does not change email signups).
2. In Google Cloud, configure a Web application OAuth client using the Supabase
   callback URL shown in Authentication → Sign In / Providers → Google as an
   authorized redirect URI. For the locally configured database this is
   `https://jpypuxrndzpktaazbutp.supabase.co/auth/v1/callback`.
3. Configure the Google OAuth consent screen for the intended users. A testing
   app permits only listed test users. Use only the basic identity/email scopes.
4. Enter the Google client ID and secret in Supabase's Google provider settings
   and enable the provider. Keep the secret out of the app and source control.
5. Add `https://<secondary-production-domain>/auth/callback` to Supabase's
   Authentication → URL Configuration → Redirect URLs. Add
   `http://localhost:3000/auth/callback` if local OAuth testing is required.
   Keep the existing site URL and redirect entries for the main app.
6. Refresh the Vercel CLI login for the correct account, inspect the root-linked
   project and its root-directory/build settings, then deploy that project only.
   Do not push the main repository's production branch as a deployment shortcut.

## Verify

- Sign-in and student signup display Google alongside the existing email form.
- Google cancellation or an expired callback returns to sign-in with a retry
  message. External `next` destinations are rejected.
- A new Google account receives `active_role = student` and a `student_profiles`
  row. Complete a simulation and sign in again to verify saved progress.
- An existing verified email account signing in with Google retains its user ID,
  role, and progress (Supabase automatic identity linking).
- A class link such as `/auth/login?next=%2Fjoin%3Fcode%3DCLASS123` returns to that
  class after Google authentication.
- Confirm the secondary production alias serves the change; the main app's
  deployment must remain unchanged.

Local checks: `pnpm --dir praxis exec tsx --test tests/auth-utils.test.ts`,
`pnpm --dir praxis run typecheck`, `pnpm --dir praxis run lint`, and
`pnpm --dir praxis run build`.

Reference: https://supabase.com/docs/guides/auth/social-login/auth-google

## Handoff status (2026-09-26)

- Feature branch: `codex/google-sign-in-secondary` in
  `sav-krish/Praxis-Updated` (`myrepo` remote).
- Main project ID: `prj_QJtmbgkPM0q3o0azWCqpceEHomjG`; do not deploy it.
  Its public alias is `praxis-alpha-eight.vercel.app`.
- Secondary project ID: `prj_CwTIuAYGw4JPuwamQdwF80vS9F6H`, root directory
  `praxis`. Its public alias is `praxis-alpha-eight-beige.vercel.app`.
- Secondary production and preview have the Supabase URL, public anon key,
  server-only service-role secret, and secondary app URL configured.
- The Google student default migration was applied to
  `jpypuxrndzpktaazbutp` through the Supabase SQL editor. A read-back query
  confirmed the Google-only default is installed. This is a shared database;
  existing accounts and email/password signup behavior were preserved.
- Created Google Cloud project **Praxis Google Sign In**, project ID
  `dotted-memory-509806-u5`. Registration is prepared for app name `Praxis`,
  external users, and contact/support `sav.krish01@gmail.com`.
- Registration is paused at the Google API Services User Data Policy agreement,
  awaiting explicit user confirmation. No OAuth client has been created yet.
- The Supabase login `krishcodes11` can run SQL but cannot edit Authentication
  settings. An owner/admin must enable Google and add the secondary callback
  URL. The existing Site URL is `https://teach-together-bel4.vercel.app/`; keep it
  and add the secondary callback to the allowlist rather than replacing it.
- Until the provider is enabled, the Google button displays an explanatory
  message and keeps the user on the email/password sign-in form.
- Local lint, TypeScript, redirect tests, and the initial production build passed.
  Callback cancellation, invalid codes, and unsafe destinations were checked
  against the built server. Successful Google OAuth still needs live testing.
