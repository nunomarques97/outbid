-- Outbid Phase 3: bids, bid history, outbid notifications, realtime

-- ---------------------------------------------------------------------------
-- bids: one row per (company, placement). "Raising a bid" updates amount in
-- place — it does NOT create a new row. Sponsored rank is never stored here;
-- it is always derived by ordering active bids on a placement by amount desc
-- (see the RPC/read-side helpers). status only tracks whether the company is
-- participating at all ('active') or has pulled out ('withdrawn') — never a
-- manually-set "am I winning" flag.
-- ---------------------------------------------------------------------------
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  placement_id uuid not null references public.placements (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, placement_id)
);

create index bids_placement_active_idx
  on public.bids (placement_id, amount desc, created_at asc)
  where status = 'active';

create trigger bids_set_updated_at
  before update on public.bids
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- bid_history: append-only audit trail. Not event sourcing — bids itself
-- stays the live source of truth; this table only exists so "what did this
-- company used to bid, and when did it change" is never lost.
-- ---------------------------------------------------------------------------
create table public.bid_history (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.bids (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  placement_id uuid not null references public.placements (id) on delete cascade,
  previous_amount numeric(10, 2),
  new_amount numeric(10, 2) not null,
  changed_at timestamptz not null default now()
);

create index bid_history_bid_idx on public.bid_history (bid_id, changed_at desc);
create index bid_history_company_idx on public.bid_history (company_id, changed_at desc);

create or replace function public.record_bid_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.bid_history (bid_id, company_id, placement_id, previous_amount, new_amount)
    values (new.id, new.company_id, new.placement_id, null, new.amount);
  elsif tg_op = 'UPDATE' and new.amount is distinct from old.amount then
    insert into public.bid_history (bid_id, company_id, placement_id, previous_amount, new_amount)
    values (new.id, new.company_id, new.placement_id, old.amount, new.amount);
  end if;
  return new;
end;
$$;

create trigger bids_record_history
  after insert or update of amount on public.bids
  for each row execute function public.record_bid_history();

-- ---------------------------------------------------------------------------
-- notifications: minimal outbid-alert model. No delivery system beyond
-- Supabase Realtime streaming new rows to a subscribed client.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  type text not null check (type in ('outbid', 'bid_confirmed')),
  placement_id uuid references public.placements (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Covers the general "all notifications for a company, newest first" query
-- (getNotifications in src/lib/supabase/queries.ts) as well as being a
-- usable prefix for company_id-only lookups.
create index notifications_company_idx
  on public.notifications (company_id, created_at desc);

-- Narrower partial index specifically for the "unread count / unread list"
-- access pattern, which the general index above can serve but not as
-- tightly (it has to filter read_at out of every row it scans).
create index notifications_company_unread_idx
  on public.notifications (company_id, created_at desc)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- Outbid detection: fires only on an actual #1-position change, not on every
-- bid shuffle. Compares the best OTHER active bid on the placement (which is
-- unaffected by this row's change) against this row's new amount:
--   - if this row just overtook that other bid (and didn't before the
--     update), the other bid's company just lost the top spot -> notify it.
-- ---------------------------------------------------------------------------
create or replace function public.handle_bid_leader_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  best_other record;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select company_id, amount
    into best_other
    from public.bids
   where placement_id = new.placement_id
     and status = 'active'
     and id <> new.id
   order by amount desc, created_at asc
   limit 1;

  if best_other.company_id is not null
     and new.amount > best_other.amount
     and (tg_op = 'INSERT' or old.amount <= best_other.amount)
  then
    insert into public.notifications (company_id, type, placement_id, payload)
    values (
      best_other.company_id,
      'outbid',
      new.placement_id,
      jsonb_build_object(
        'leader_company_id', new.company_id,
        'leader_amount', new.amount,
        'previous_amount', best_other.amount
      )
    );
  end if;

  return new;
end;
$$;

create trigger bids_notify_outbid
  after insert or update of amount, status on public.bids
  for each row execute function public.handle_bid_leader_change();

-- ---------------------------------------------------------------------------
-- Realtime: enabled via migration rather than a manual dashboard toggle.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.notifications;
