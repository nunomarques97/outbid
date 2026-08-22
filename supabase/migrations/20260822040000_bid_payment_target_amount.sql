-- Outbid Phase 27B.1: separate "amount charged" from "bid amount this
-- payment establishes".
--
-- The original Phase 27B model charged (and activated at) the full new
-- bid amount on every raise. The correct model only charges the DELTA
-- above the company's current active bid, then activates the bid at the
-- full target amount:
--
--   charge_amount = max(target_bid_amount - current_active_bid_amount, 0)
--
-- (current_active_bid_amount is 0 when there is no active bid — a
-- brand-new bid charges its full target amount, same as before.)
--
-- bid_payments.amount already meant "amount charged" in practice — every
-- existing row's `amount` stays exactly as-is, historically accurate,
-- and additionally correct under the new model for the one kind of row
-- that exists so far (a first-ever bid, where current was 0, so charge
-- and target were numerically identical). This migration only ADDS the
-- previously-missing target_bid_amount column and backfills it from the
-- existing `amount`, which is exactly right for that case. No historical
-- amount is rewritten.
alter table public.bid_payments
  add column target_bid_amount numeric(10, 2);

update public.bid_payments
   set target_bid_amount = amount
 where target_bid_amount is null;

alter table public.bid_payments
  alter column target_bid_amount set not null;

alter table public.bid_payments
  add constraint bid_payments_target_bid_amount_positive check (target_bid_amount > 0);

comment on column public.bid_payments.amount is
  'Actual EUR amount charged by this payment (the delta above the company''s current active bid at request time, or the full amount for a brand-new bid). NOT the resulting bid amount.';
comment on column public.bid_payments.target_bid_amount is
  'The bid amount this payment establishes on success (what bids.amount becomes) — distinct from `amount`, which is what was actually charged.';

-- ---------------------------------------------------------------------------
-- activate_bid_payment(): activate at the payment's stored
-- target_bid_amount (not its charged amount — those now differ on any
-- raise). Also guards against a late-arriving webhook regressing an
-- already-higher bid: when the existing bid is already 'active', the new
-- amount is GREATEST(existing, incoming), so an older/lower-target
-- payment that completes after a newer/higher one can never lower the
-- live bid — it just activates its own bid_payments row as succeeded
-- (preserved as history) without changing bids.amount. That floor is
-- deliberately NOT applied when the existing bid is 'withdrawn': a
-- withdrawn bid's old amount is stale history, not a "current higher
-- bid" to protect, so re-entering after a withdrawal lands on exactly
-- the new target_bid_amount, never floored by whatever was withdrawn.
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
  values (v_payment.company_id, v_payment.placement_id, v_payment.target_bid_amount, 'active')
  on conflict (company_id, placement_id)
  do update set
    amount = case
      when public.bids.status = 'active' then greatest(public.bids.amount, excluded.amount)
      else excluded.amount
    end,
    status = 'active'
  returning * into v_bid;

  return v_bid;
end;
$$;
-- Grant/revoke state (service_role only) is unchanged by create or
-- replace function — see 20260822030000_fix_activate_bid_payment_grants.sql.
