# Outbid — Supabase backend

Phase 3 data foundation: schema, RLS, RPC functions, and seed data for the
Outbid prototype. See `../.claude/plans/` (or the Phase 3 report) for the
full design rationale — this file is just the "how do I actually run this"
reference.

## What's here

```
supabase/
  config.toml              — local dev config (from `supabase init`)
  migrations/               — seven ordered SQL files, applied in filename order:
    *_core_schema.sql        profiles, companies, company_members, categories
    *_content_schema.sql     placements, battles, deals, trends
    *_bids_and_history.sql   bids, bid_history, notifications, outbid trigger, realtime
    *_votes.sql              company_votes, battle_votes
    *_rls_policies.sql       every RLS policy, in one file for easy review
    *_rpc_functions.sql      place_bid, withdraw_bid, signup/company-creation triggers
    *_billing_foundations.sql  company_billing_profiles (no payment logic — see file header)
  seed.sql                   — the current mock dataset, translated to SQL inserts
  tests/bids_and_rls.test.sql — pgTAP tests (NOT executed in this environment — see below)
```

## Required environment variables

Copy `.env.example` (project root) to `.env.local` and fill in:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Both come from your Supabase project dashboard under **Settings → API**. The
app runs fine with these unset — it falls back to the existing mock data and
shows a "not configured" message in the sign-in dialog. **Never** put the
`service_role` key here or anywhere in frontend code.

## Setting up a real project

1. Create a project at [supabase.com](https://supabase.com) (this step can't
   be automated from here — it needs your account).
2. Put its URL + anon key into `.env.local` as above.
3. Link the CLI to it and push the schema:
   ```
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
4. Seed it: open the SQL Editor in the Supabase dashboard, paste the
   contents of `supabase/seed.sql`, and run it once. (`db push` applies
   migrations only — seeding a remote project is a separate, one-time step.)
5. Restart the dev server so Vite picks up the new env vars.

## Local development (needs Docker)

If you have Docker available, the full loop works without touching the
dashboard at all:

```
npx supabase start        # spins up local Postgres + Auth + Realtime + Studio
npx supabase db reset      # applies all migrations, then runs seed.sql
```

`supabase start` prints a local URL + anon key to put in `.env.local`.

**This repo's environment does not have Docker**, so none of the above has
actually been run here — the migrations and seed file are written and
reviewed, not executed. Once you run `db reset` locally (or push + seed a
remote project as above), please sanity-check that it applies cleanly.

## Running the database tests

`supabase/tests/bids_and_rls.test.sql` uses pgTAP and covers what can only be
proven at the database layer — RLS actually blocking cross-company writes,
and the outbid-notification trigger firing correctly. Run with:

```
npx supabase test db
```

(requires the local dev stack from `supabase start`, i.e. Docker). These
have **not** been executed in this environment.

The ranking/ordering logic itself (ordering, tie-breaks, organic/sponsored
independence, battle-vote exclusivity) is covered separately by real,
executed unit tests — see `npm test` at the project root
(`src/lib/ranking.test.ts`, `src/store/useSession.test.ts`).

## Regenerating TypeScript types

`src/lib/supabase/database.types.ts` is hand-authored to match the
migrations (no live project was available to generate it from). Once you
have one linked:

```
npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/database.types.ts
```
