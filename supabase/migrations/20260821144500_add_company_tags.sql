-- Genuine schema gap found while wiring the frontend to real data: the
-- frontend's Company domain type (src/mocks/types.ts, unchanged — see the
-- Phase 3 report) has always had a `tags` field (small descriptive chips,
-- e.g. "Sprints", "Cold brew", "Free tier"), rendered on the company profile
-- page, but no column for it was ever added to `companies`. This is purely
-- additive and safe to run against the already-seeded staging project: a
-- NOT NULL column with a default backfills existing rows to '{}' rather
-- than failing.
--
-- This does NOT retroactively backfill the *original* curated tag values
-- for the 19 already-seeded companies (that's a data change, not a schema
-- change, and this migration only prepares the column) — see the Phase 3
-- report for the one-time backfill statement to run separately if wanted.

alter table public.companies
  add column tags text[] not null default '{}';
