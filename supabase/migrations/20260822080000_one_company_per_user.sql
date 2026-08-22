-- Outbid Phase 31.2: ONE USER ACCOUNT = ONE COMPANY (v1 simplification).
--
-- company_members' existing UNIQUE(company_id, user_id) only prevents a
-- user from joining the SAME company twice — it does nothing to stop a
-- user from owning/joining multiple DIFFERENT companies, which is exactly
-- how one real staging account (confirmed live before writing this
-- migration) ended up owning both "Test Company" (created first, has real
-- bids/bid_payments) and "gdww2" (created later, empty — no bids, no
-- payments, no deals) — the two-company case the earlier dashboard
-- isolation bug report was actually testing against.
--
-- This migration:
--   1. Resolves that one pre-existing duplicate (generically: keep each
--      user's EARLIEST company_members row, drop any later ones — a
--      no-op for every other user, all of whom already have exactly one).
--      Only the membership LINK is removed; the "gdww2" company row
--      itself, and all historical data anywhere, is untouched.
--   2. Adds a UNIQUE(user_id) constraint — the structural, unbypassable
--      invariant: a user can never appear in company_members more than
--      once, covering both self-creating a second company AND being
--      added to a second company by its owner.
--   3. Tightens companies' INSERT policy so creating a second company is
--      rejected server-side, with a clear cause, before it ever reaches
--      the point of relying on the constraint above to fail loudly.

-- ---------------------------------------------------------------------------
-- 1. Resolve the one confirmed duplicate (and any other, hypothetical one)
-- by keeping only each user's earliest membership.
-- ---------------------------------------------------------------------------
delete from public.company_members cm
where cm.id not in (
  select distinct on (user_id) id
  from public.company_members
  order by user_id, created_at asc
);

-- ---------------------------------------------------------------------------
-- 2. The structural invariant. Applies regardless of entry point —
-- self-creating a company (handle_new_company's trigger insert) or being
-- added as an editor to someone else's (the "owners can add members"
-- policy) both go through this same table and are both blocked by it.
-- ---------------------------------------------------------------------------
alter table public.company_members
  add constraint company_members_user_id_unique unique (user_id);

-- ---------------------------------------------------------------------------
-- 3. companies INSERT: reject a second company with a clear RLS cause
-- before the insert (and handle_new_company's trigger) even runs, rather
-- than only relying on the constraint above's less specific failure.
-- ---------------------------------------------------------------------------
drop policy "authenticated users can create a company" on public.companies;

create policy "authenticated users can create their one company"
  on public.companies for insert
  to authenticated
  with check (
    not exists (select 1 from public.company_members where user_id = auth.uid())
  );
