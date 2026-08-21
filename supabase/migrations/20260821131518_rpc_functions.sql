-- Outbid Phase 3: RPC functions + bootstrap triggers
-- place_bid / withdraw_bid, auto-profile-on-signup, auto-owner-on-company-create

-- ---------------------------------------------------------------------------
-- place_bid: the one sanctioned way to set a company's bid on a placement.
--
-- There is no client-side read -> compute rank -> write here, because rank
-- is never stored: it's always ORDER BY amount DESC at read time. This
-- function only ever writes ONE row (an upsert keyed on the bids table's
-- UNIQUE(company_id, placement_id) constraint), which Postgres already makes
-- atomic under concurrent callers via normal row-level locking — two
-- advertisers bidding on different placements never contend, and two
-- advertisers racing to update the *same* company's *same* placement bid
-- (which shouldn't happen outside of a double-click) simply serialize, with
-- the last write winning, exactly as expected for "my current bid amount".
--
-- It's still a dedicated security definer RPC rather than a raw client
-- upsert so that: (1) authorization is re-checked in one place with a clear
-- error, and (2) the bid_history + outbid-notification triggers fire
-- predictably inside the same transaction as the write.
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

  insert into public.bids (company_id, placement_id, amount, status)
  values (p_company_id, p_placement_id, p_amount, 'active')
  on conflict (company_id, placement_id)
  do update set amount = excluded.amount, status = 'active'
  returning * into v_bid;

  return v_bid;
end;
$$;

grant execute on function public.place_bid(uuid, uuid, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- withdraw_bid: stop participating in a placement without losing history.
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_bid(
  p_company_id uuid,
  p_placement_id uuid
)
returns public.bids
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bid public.bids;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Not authorized to manage bids for this company' using errcode = '42501';
  end if;

  update public.bids
     set status = 'withdrawn'
   where company_id = p_company_id
     and placement_id = p_placement_id
  returning * into v_bid;

  if v_bid.id is null then
    raise exception 'No bid found for this company on this placement' using errcode = 'P0002';
  end if;

  return v_bid;
end;
$$;

grant execute on function public.withdraw_bid(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth.users row appears.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Auto-create an 'owner' membership whenever a real (authenticated) user
-- creates a company. Deliberately skipped when auth.uid() is null, i.e. for
-- seed-data inserts run by migrations/service role — this is also what
-- structurally leaves seed companies with zero members, alongside the
-- explicit is_seed flag, distinguishing demo data from real user data.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    insert into public.company_members (company_id, user_id, role)
    values (new.id, auth.uid(), 'owner');
  end if;
  return new;
end;
$$;

create trigger on_company_created
  after insert on public.companies
  for each row execute function public.handle_new_company();
