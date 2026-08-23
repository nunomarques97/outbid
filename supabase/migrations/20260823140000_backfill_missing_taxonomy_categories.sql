-- Repcastr: backfill the 4 category rows that earlier migrations assumed
-- already existed.
--
-- Root cause: 20260822090000_category_architecture_v1.sql and
-- 20260822100000_global_bid_and_taxonomy_v2.sql rename categories IN PLACE
-- (e.g. `update categories set slug = 'technology', ... where slug =
-- 'web-hosting'`), assuming 4 rows (project-management-tools, web-hosting,
-- coffee-roasters, fitness-apps) already existed from a pre-migration,
-- staging-only ad-hoc seed that predates migrations being the source of
-- truth. Those 4 rows were never created by any migration. On a database
-- built purely from migrations (a fresh production deploy), those UPDATEs
-- silently match zero rows, so technology/health-fitness/coffee/software
-- never get created — leaving the migration history non-self-sufficient.
-- Confirmed live: production ended up with 18 categories after all prior
-- migrations, versus staging's 22.
--
-- Values below are copied verbatim from staging's current, canonical rows
-- (ground truth, not reconstructed from migration diffs), so this produces
-- byte-identical rows to staging's real taxonomy on any fresh database:
-- 13 active + 9 archived = 22 total. is_archived is set directly to each
-- category's final resting state (coffee/software were archived by Phase
-- 34's merge into food-dining/technology) rather than replaying that merge,
-- since a fresh database has no company_categories/user_interests rows
-- referencing them to remap.
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING makes this a full no-op on any
-- database that already has these rows (staging), and a pure backfill on
-- one that doesn't (production).
insert into public.categories (slug, name, icon, description, is_archived) values
  ('technology', 'Technology', 'Cpu', 'Computing, infrastructure, hosting, and IT.', false),
  ('health-fitness', 'Health & Fitness', 'Dumbbell', 'Healthcare, wellness, gyms, and fitness.', false),
  ('coffee', 'Coffee', 'Coffee', 'Roasters, cafes, and coffee subscriptions.', true),
  ('software', 'Software', 'AppWindow', 'Apps, platforms, and developer tools businesses build and run on.', true)
on conflict (slug) do nothing;
