-- Outbid Phase 27B.2: bids are one-way financial commitments.
--
-- place_bid() previously only rejected p_amount > current active amount
-- (a raise, which must go through payment) — anything <= current,
-- including a strictly LOWER amount, fell through to a free upsert. That
-- let a company lower an active €20 bid to €10 directly, for free, with
-- no Stripe involvement at all. Under the authoritative model, lowering
-- isn't a free action — it isn't an action at all: a company that wants
-- to reduce its financial commitment must withdraw (see withdraw_bid(),
-- unchanged) and, if it wants back in later, pay again for a brand-new
-- bid. This migration makes place_bid() reject p_amount < current
-- explicitly, with a message pointing at withdraw — same-amount
-- resubmission remains the one free, permitted case.
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

  if v_current_amount is null then
    raise exception 'Starting a bid requires payment — use the paid bid flow' using errcode = '42501';
  end if;

  if p_amount > v_current_amount then
    raise exception 'Raising a bid requires payment — use the paid bid flow' using errcode = '42501';
  end if;

  if p_amount < v_current_amount then
    raise exception 'Your bid cannot be lowered. Withdraw the bid if you want to leave this placement.'
      using errcode = '42501';
  end if;

  -- p_amount = v_current_amount: a free, idempotent reaffirmation — the
  -- only case this function still permits.
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
