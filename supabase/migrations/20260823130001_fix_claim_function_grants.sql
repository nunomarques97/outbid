-- Repcastr Phase 39 follow-up, found via the exact live-grant check this
-- project has hit before (see 20260822030000_fix_activate_bid_payment_grants.sql):
-- Supabase grants EXECUTE on every newly created public-schema function to
-- anon/authenticated/service_role by default (ALTER DEFAULT PRIVILEGES at
-- the project level, for PostgREST's benefit) — `revoke ... from public`
-- alone does NOT touch those separate, explicit per-role grants. Confirmed
-- live: anon and authenticated both still had EXECUTE on
-- approve_company_claim/reject_company_claim (service-role-only by design)
-- and anon still had it on create_company_claim (authenticated-only by
-- design) immediately after the previous migration.

revoke execute on function public.approve_company_claim(uuid, text) from anon, authenticated;
revoke execute on function public.reject_company_claim(uuid, text) from anon, authenticated;
revoke execute on function public.create_company_claim(uuid, text, text, text, text) from anon;
