-- Outbid Phase 27B: one-time Stripe payments for bids.
--
-- Business rule (the only one that matters here): Outbid has no recurring
-- billing. A company pays once, in full, whenever it establishes a NEW bid
-- or RAISES an existing one. Simply remaining in a placement — including
-- losing and regaining the lead without changing amount — never charges
-- anything. Lowering an existing bid doesn't charge anything either (no
-- new financial commitment is being made). A prior payment is never
-- auto-refunded when a company is outbid or lowers its own bid.
--
-- This migration:
--   1. Locks down company_billing_profiles' Stripe-controlled columns
--      (flagged in the Phase 27A audit as directly client-writable).
--   2. Adds bid_payments — one row per Stripe payment attempt, the
--      append-only record of what was actually paid for.
--   3. Adds stripe_webhook_events — Stripe event-id idempotency guard.
--   4. Redefines place_bid() so it can no longer create or raise a bid on
--      its own — that would let a client set a paid-for bid amount for
--      free. It remains the direct path only for lowering (or
--      re-affirming) an amount already paid for.
--   5. Adds activate_bid_payment() — the ONLY way a bid_payments row can
--      turn into a live bid. Callable solely by trusted server-side code
--      (the stripe-webhook Edge Function via the service_role key); no
--      grant is given to authenticated/anon, so a client can never mark
--      its own payment "succeeded" or activate its own bid.

-- ---------------------------------------------------------------------------
-- 1. company_billing_profiles: stop clients writing Stripe-controlled state.
-- ---------------------------------------------------------------------------

-- A Stripe customer id, once assigned, identifies exactly one company.
alter table public.company_billing_profiles
  add constraint company_billing_profiles_customer_id_unique unique (billing_provider_customer_id);

-- The existing "company members can update their own billing profile"
-- policy (billing_foundations migration) still lets a member update
-- billing_email/currency, which is fine — but it also currently lets them
-- write billing_provider_customer_id and status directly, which must only
-- ever reflect what Stripe actually reports. RLS can't distinguish "which
-- columns changed" on its own, so this trigger does: any change to those
-- two columns is rejected unless it comes from the service_role (i.e. from
-- trusted Edge Function / webhook code, not a client's anon/authenticated
-- session).
create or replace function public.prevent_billing_profile_system_field_changes()
returns trigger
language plpgsql
as $$
begin
  if (new.billing_provider_customer_id is distinct from old.billing_provider_customer_id
      or new.status is distinct from old.status)
     and coalesce(auth.role(), 'anon') <> 'service_role' then
    raise exception 'billing_provider_customer_id and status are system-controlled and cannot be changed directly'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger company_billing_profiles_protect_system_fields
  before update on public.company_billing_profiles
  for each row execute function public.prevent_billing_profile_system_field_changes();

-- ---------------------------------------------------------------------------
-- 2. bid_payments: one row per Stripe payment attempt for a bid.
--
-- Not event sourcing and not a subscription/invoice table — each row is a
-- single one-time payment attempt tied to one (company, placement, amount).
-- A company that has paid three times for the same placement (e.g. 200,
-- then 260, then 300) has three rows here, all historical except the
-- newest succeeded one; none are ever deleted or retroactively refunded.
-- ---------------------------------------------------------------------------
create table public.bid_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  placement_id uuid not null references public.placements (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'cancelled')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "This company's payment history, newest first" — the read pattern behind
-- any future billing-tab UI.
create index bid_payments_company_idx on public.bid_payments (company_id, created_at desc);

-- "Does this company already have a pending attempt on this placement?" —
-- used by create-bid-payment to supersede a stale attempt before starting
-- a new one, so at most one pending payment per (company, placement) is
-- ever live at a time.
create index bid_payments_pending_lookup_idx
  on public.bid_payments (company_id, placement_id)
  where status = 'pending';

create trigger bid_payments_set_updated_at
  before update on public.bid_payments
  for each row execute function public.set_updated_at();

alter table public.bid_payments enable row level security;

create policy "company members can view their own payment history"
  on public.bid_payments for select
  to authenticated
  using (public.is_company_member(company_id));

-- No insert/update/delete policy for authenticated or anon, deliberately.
-- Rows are created and transitioned only by trusted server-side code (the
-- create-bid-payment and stripe-webhook Edge Functions, using the
-- service_role key, which bypasses RLS entirely). A client can read its
-- own company's payment history but can never fabricate a "succeeded" row,
-- point a payment at someone else's company, or invent a Stripe id.

-- ---------------------------------------------------------------------------
-- 3. stripe_webhook_events: idempotency guard, keyed on Stripe's own event
-- id. The webhook inserts a row before processing an event and skips any
-- event id it's already seen, so a duplicate delivery (Stripe retries on
-- anything but a 2xx) is harmless.
-- ---------------------------------------------------------------------------
create table public.stripe_webhook_events (
  id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
-- No policies: never read or written by anon/authenticated, only by the
-- stripe-webhook Edge Function via the service_role key (which bypasses
-- RLS). Enabling RLS with zero policies denies every other role by
-- default, matching this project's "every table gets RLS enabled" rule.

-- ---------------------------------------------------------------------------
-- 4. place_bid(): can no longer create or raise a bid for free.
--
-- Establishing a new bid, or raising an existing active one, is now a paid
-- action that must go through bid_payments + Stripe Checkout +
-- activate_bid_payment() below. This RPC remains the direct, unpaid path
-- only for lowering (or re-submitting the same) amount on a bid the
-- company already has active — no new financial commitment, so no payment
-- is required.
-- ---------------------------------------------------------------------------
create or replace function public.place_bid(
  p_company_id uuid,
  p_placement_id uuid,
  p_amount numeric
)
returns public.bids
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bid public.bids;
  v_current_amount numeric(10, 2);
begin
  if p_amount <= 0 then
    raise exception 'Bid amount must be greater than zero' using errcode = '22023';
  end if;

  if not public.is_company_member(p_company_id) then
    raise exception 'Not authorized to bid on behalf of this company' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.placements where id = p_placement_id and is_active
  ) then
    raise exception 'Placement is not open for bidding' using errcode = '22023';
  end if;

  select amount into v_current_amount
    from public.bids
   where company_id = p_company_id
     and placement_id = p_placement_id
     and status = 'active';

  if v_current_amount is null or p_amount > v_current_amount then
    raise exception 'Starting or raising a bid requires payment — use the paid bid flow' using errcode = '42501';
  end if;

  insert into public.bids (company_id, placement_id, amount, status)
  values (p_company_id, p_placement_id, p_amount, 'active')
  on conflict (company_id, placement_id)
  do update set amount = excluded.amount, status = 'active'
  returning * into v_bid;

  return v_bid;
end;
$$;
-- Existing grant to authenticated (rpc_functions migration) is preserved
-- by create or replace function, since the signature is unchanged.

-- ---------------------------------------------------------------------------
-- 5. activate_bid_payment(): the only way a bid_payments row becomes a live
-- bid. Invoked exclusively by the stripe-webhook Edge Function after Stripe
-- confirms the checkout session completed — never by the browser redirect,
-- which is not a source of truth. Idempotent: a duplicate webhook delivery
-- for an already-succeeded payment is a no-op, not an error.
-- ---------------------------------------------------------------------------
create or replace function public.activate_bid_payment(p_payment_id uuid)
returns public.bids
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.bid_payments;
  v_bid public.bids;
begin
  select * into v_payment from public.bid_payments where id = p_payment_id for update;

  if v_payment.id is null then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  if v_payment.status = 'succeeded' then
    select * into v_bid from public.bids
     where company_id = v_payment.company_id and placement_id = v_payment.placement_id;
    return v_bid;
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment % is not pending (status: %)', p_payment_id, v_payment.status
      using errcode = '22023';
  end if;

  update public.bid_payments
     set status = 'succeeded'
   where id = p_payment_id;

  insert into public.bids (company_id, placement_id, amount, status)
  values (v_payment.company_id, v_payment.placement_id, v_payment.amount, 'active')
  on conflict (company_id, placement_id)
  do update set amount = excluded.amount, status = 'active'
  returning * into v_bid;

  return v_bid;
end;
$$;

-- Deliberately no "grant execute ... to authenticated" here. Functions in
-- this schema are unreachable by anon/authenticated unless explicitly
-- granted (see every other RPC in this project); this comment makes the
-- omission intentional rather than an oversight. Only service_role
-- (Postgres superuser-equivalent, used by Edge Functions) can call it.
comment on function public.activate_bid_payment(uuid) is
  'Webhook-only: activates a bid after Stripe confirms payment. Deliberately not granted to authenticated/anon — a client must never be able to mark its own bid paid.';
