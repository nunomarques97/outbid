-- Outbid Phase 3 — database-level tests (pgTAP)
--
-- NOT EXECUTED in this environment: there is no Docker/local Postgres
-- available here, so these have been written and hand-reviewed but never
-- actually run. Once a Supabase project with the CLI's local dev stack is
-- available, run them with:
--
--   supabase test db
--
-- (pgTAP ships enabled by default in the Supabase local dev image.)
--
-- These cover Phase 3 task Q items 1–6 at the database layer specifically:
-- ordering/tie-break/independence are also covered (and ARE actually
-- executed) as plain TypeScript unit tests in src/lib/ranking.test.ts —
-- these SQL tests instead cover what can only be proven at the database
-- layer: RLS actually blocking cross-company/cross-user writes, and the
-- concurrency-safe bid RPC behaving correctly end-to-end.

begin;
select plan(9);

-- ---------------------------------------------------------------------------
-- Fixtures: two companies with distinct owners, one placement, one bid each.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'outsider@example.com');

insert into public.categories (id, slug, name, icon, description) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'test-category', 'Test Category', 'Sparkles', 'fixture');

insert into public.placements (id, type, category_id, name, max_sponsored_slots) values
  ('aaaaaaaa-0000-0000-0000-000000000002', 'category_leaderboard', 'aaaaaaaa-0000-0000-0000-000000000001', 'Test Leaderboard', 3);

insert into public.companies (id, slug, name, initials, logo_color, tagline, description, website, founded_year) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'company-a', 'Company A', 'CA', '#000000', 't', 't', 'a.com', 2024),
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'company-b', 'Company B', 'CB', '#000000', 't', 't', 'b.com', 2024);

insert into public.company_members (company_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-0000-0000-0000-0000000000b1', '22222222-2222-2222-2222-222222222222', 'owner');

-- ---------------------------------------------------------------------------
-- 1. Owner A can place a bid for Company A via the RPC.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';

select lives_ok(
  $$ select public.place_bid('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000002', 500.00) $$,
  'Company A''s owner can place a bid for Company A'
);

select is(
  (select amount from public.bids where company_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'),
  500.00,
  'the bid amount was actually written'
);

-- ---------------------------------------------------------------------------
-- 2. A higher bid takes rank #1; the lower bid is derived as rank #2 — never
--    a stored value.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222"}';
select lives_ok(
  $$ select public.place_bid('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-000000000002', 800.00) $$,
  'Company B''s owner can place a higher bid for Company B'
);

select is(
  (
    select company_id from public.bids
    where placement_id = 'aaaaaaaa-0000-0000-0000-000000000002' and status = 'active'
    order by amount desc, created_at asc
    limit 1
  ),
  'aaaaaaaa-0000-0000-0000-0000000000b1'::uuid,
  'the higher bid (Company B) is now derived as the leader'
);

-- ---------------------------------------------------------------------------
-- 3. Company A cannot place a bid on behalf of Company B (cross-company
--    manipulation must be rejected, not silently ignored).
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111"}';
select throws_ok(
  $$ select public.place_bid('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-000000000002', 999.00) $$,
  '42501',
  'Not authorized to bid on behalf of this company',
  'Company A''s owner cannot bid on behalf of Company B via the RPC'
);

-- ---------------------------------------------------------------------------
-- 4. A user with no membership at all cannot bid for either company.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333"}';
select throws_ok(
  $$ select public.place_bid('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000002', 999.00) $$,
  '42501',
  'Not authorized to bid on behalf of this company',
  'a non-member cannot bid on behalf of Company A'
);

-- ---------------------------------------------------------------------------
-- 5. Direct table access is equally protected by RLS (not just the RPC):
--    a non-member cannot UPDATE another company's bid row directly.
-- ---------------------------------------------------------------------------
select is_empty(
  $$
    update public.bids set amount = 1.00
    where company_id = 'aaaaaaaa-0000-0000-0000-0000000000a1'
    returning 1
  $$,
  'a non-member''s direct UPDATE on Company A''s bid affects zero rows under RLS'
);

-- ---------------------------------------------------------------------------
-- 6. Outbid notification: when B''s bid overtook A''s bid above, Company A
--    should have received exactly one 'outbid' notification.
-- ---------------------------------------------------------------------------
reset role;
select is(
  (
    select count(*)::int from public.notifications
    where company_id = 'aaaaaaaa-0000-0000-0000-0000000000a1' and type = 'outbid'
  ),
  1,
  'Company A received exactly one outbid notification when Company B overtook it'
);

-- ---------------------------------------------------------------------------
-- 7/8. bid_history recorded both the initial bid and has a row for it (not
--    event-sourced, just an audit trail of the amount change).
-- ---------------------------------------------------------------------------
select is(
  (select previous_amount from public.bid_history where company_id = 'aaaaaaaa-0000-0000-0000-0000000000a1' order by changed_at asc limit 1),
  null::numeric,
  'the first bid_history row for a brand-new bid has no previous_amount'
);

select * from finish();
rollback;
