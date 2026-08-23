-- Restores the Data API role privileges Supabase normally auto-provisions
-- when a project is created (broad table/function grants to anon,
-- authenticated, service_role, with RLS as the real authorization
-- boundary) -- confirmed live to have never applied on this project via a
-- direct information_schema comparison against OUTBID-STAGING, where every
-- table shows anon/authenticated/service_role with identical privileges
-- and production shows none at all for anon/authenticated. This matches
-- the "new cloud default" behavior already documented in this repo's own
-- supabase/config.toml ([api] auto_expose_new_tables comment): new
-- entities are NOT auto-exposed without explicit grants on newer projects.
-- No migration in this repo's history ever issued that grant itself --
-- every table/function relied entirely on the automatic behavior, which
-- silently never fired for this specific project.
--
-- Security note: this restores the SAME base-grant model already running
-- on staging, which is also Supabase's own default project bootstrap.
-- Base table grants do not, by themselves, expose any row or permit any
-- write RLS wouldn't already allow -- every table here has RLS enabled
-- (confirmed separately), and RLS is what actually decides what
-- anon/authenticated can see or change, not this grant. Nothing below
-- grants anon/authenticated write access to anything they couldn't
-- already attempt-and-be-rejected-by-RLS on staging today.
--
-- approve_company_claim and reject_company_claim are deliberately absent
-- from this migration: they already carry their own correct, explicit
-- grants (service_role + postgres only) from
-- 20260823130000_company_verification_and_claims.sql, confirmed live and
-- unaffected by this bug, and this migration never does a blanket "all
-- functions" grant that could touch them.
--
-- Idempotent: GRANT and ALTER DEFAULT PRIVILEGES are both no-ops when the
-- privilege already exists, so this is a full no-op on staging (already
-- correct) and a pure backfill on production.

-- ---------------------------------------------------------------------------
-- 1. Existing tables & views.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete, truncate, references, trigger
  on all tables in schema public
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Existing functions -- explicit, per-function. Never a blanket "all
-- functions in schema" grant, so anything not listed here (namely
-- approve_company_claim/reject_company_claim) is untouched.
-- ---------------------------------------------------------------------------
grant execute on function public.enforce_company_categories_limit() to anon, authenticated, service_role;
grant execute on function public.enforce_company_categories_max() to anon, authenticated, service_role;
grant execute on function public.enforce_company_categories_min() to anon, authenticated, service_role;
grant execute on function public.generate_unique_username(text) to anon, authenticated, service_role;
grant execute on function public.handle_bid_leader_change() to anon, authenticated, service_role;
grant execute on function public.handle_new_company() to anon, authenticated, service_role;
grant execute on function public.handle_new_company_billing_profile() to anon, authenticated, service_role;
grant execute on function public.handle_new_company_verification() to anon, authenticated, service_role;
grant execute on function public.handle_new_user() to anon, authenticated, service_role;
grant execute on function public.is_company_member(uuid, text[]) to anon, authenticated, service_role;
grant execute on function public.prevent_billing_profile_system_field_changes() to anon, authenticated, service_role;
grant execute on function public.prevent_review_identity_change() to anon, authenticated, service_role;
grant execute on function public.record_bid_history() to anon, authenticated, service_role;
grant execute on function public.set_review_author_name() to anon, authenticated, service_role;
grant execute on function public.set_updated_at() to anon, authenticated, service_role;

-- These three already carry an explicit `grant ... to authenticated` in
-- their own migrations, applied correctly on production -- only anon and
-- service_role (which would have come from the never-fired automatic
-- default-privilege grant) were missing.
grant execute on function public.place_bid(uuid, uuid, numeric) to anon, service_role;
grant execute on function public.set_company_categories(uuid, uuid[]) to anon, service_role;
grant execute on function public.withdraw_bid(uuid, uuid) to anon, service_role;

-- create_company_claim/create_report already correctly grant authenticated
-- (and correctly omit anon) on production; only service_role's
-- default-privilege grant never applied.
grant execute on function public.create_company_claim(uuid, text, text, text, text) to service_role;
grant execute on function public.create_report(text, uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 3. Default privileges for FUTURE objects. Every migration runs as
-- `postgres`, so without this, the very next migration that adds a table or
-- an "ordinary" function (no explicit grant of its own) reintroduces this
-- exact bug on production. Matches staging's own default-privilege rule
-- (confirmed via pg_default_acl) and this project's established pattern of
-- "grant broadly by default, then explicitly revoke the sensitive ones" --
-- see 20260823130001_fix_claim_function_grants.sql for precedent.
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  grant select, insert, update, delete, truncate, references, trigger on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to anon, authenticated, service_role;
