-- Outbid Phase 3: Row Level Security
-- Every user/company/business-sensitive table gets RLS enabled here, with
-- every policy for every table kept in this one file so the full security
-- surface can be reviewed in one place.

-- ---------------------------------------------------------------------------
-- Helper: is the current authenticated user a member (of the given role(s))
-- of a company? Used by nearly every write policy below instead of repeating
-- the same subquery. security definer + stable so it can read
-- company_members regardless of the caller's own RLS visibility into it.
-- ---------------------------------------------------------------------------
create or replace function public.is_company_member(
  p_company_id uuid,
  p_roles text[] default array['owner', 'editor']
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_id = p_company_id
      and user_id = auth.uid()
      and role = any(p_roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles — a user manages only their own profile.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles are self-readable"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles are self-updatable"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- companies — public profile, membership-gated writes. A company can exist
-- and be browsed with zero advertising activity.
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;

create policy "companies are publicly readable"
  on public.companies for select
  using (true);

create policy "authenticated users can create a company"
  on public.companies for insert
  to authenticated
  with check (true);

create policy "company members can update their company"
  on public.companies for update
  to authenticated
  using (public.is_company_member(id))
  with check (public.is_company_member(id));

create policy "company owners can delete their company"
  on public.companies for delete
  to authenticated
  using (public.is_company_member(id, array['owner']));

-- ---------------------------------------------------------------------------
-- company_members — members can see their fellow members; only owners
-- manage membership directly. (The owner row for a brand-new company is
-- created by a security definer trigger, see rpc_functions migration, so
-- this insert policy governs adding *additional* members.)
-- ---------------------------------------------------------------------------
alter table public.company_members enable row level security;

create policy "members can view their own company's roster"
  on public.company_members for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "owners can add members"
  on public.company_members for insert
  to authenticated
  with check (public.is_company_member(company_id, array['owner']));

create policy "owners can change member roles"
  on public.company_members for update
  to authenticated
  using (public.is_company_member(company_id, array['owner']))
  with check (public.is_company_member(company_id, array['owner']));

create policy "owners can remove members"
  on public.company_members for delete
  to authenticated
  using (public.is_company_member(company_id, array['owner']));

-- ---------------------------------------------------------------------------
-- categories / placements / company_categories — curated reference data.
-- Public read; no authenticated-write policy this phase (service role only).
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
create policy "categories are publicly readable"
  on public.categories for select
  using (true);

alter table public.placements enable row level security;
create policy "placements are publicly readable"
  on public.placements for select
  using (true);

alter table public.company_categories enable row level security;
create policy "company_categories are publicly readable"
  on public.company_categories for select
  using (true);

-- ---------------------------------------------------------------------------
-- battles / deals / trends / trend_companies — curated content. Public
-- read; no authenticated-write policy this phase.
-- ---------------------------------------------------------------------------
alter table public.battles enable row level security;
create policy "battles are publicly readable"
  on public.battles for select
  using (true);

alter table public.deals enable row level security;
create policy "deals are publicly readable"
  on public.deals for select
  using (true);

alter table public.trends enable row level security;
create policy "trends are publicly readable"
  on public.trends for select
  using (true);

alter table public.trend_companies enable row level security;
create policy "trend_companies are publicly readable"
  on public.trend_companies for select
  using (true);

-- ---------------------------------------------------------------------------
-- bids — transparent by design: anyone can read every active bid amount
-- (that visibility IS the product). Only an owner/editor of the bidding
-- company may write it. In practice, writes should go through the
-- place_bid()/withdraw_bid() RPCs (rpc_functions migration), but these
-- policies independently protect direct table access too.
-- ---------------------------------------------------------------------------
alter table public.bids enable row level security;

create policy "bids are publicly readable"
  on public.bids for select
  using (true);

create policy "company members can create their company's bids"
  on public.bids for insert
  to authenticated
  with check (public.is_company_member(company_id));

create policy "company members can update their company's bids"
  on public.bids for update
  to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- bid_history — visible only to the company that owns the bid. No
-- authenticated-write policy: only the security definer trigger writes it.
-- ---------------------------------------------------------------------------
alter table public.bid_history enable row level security;

create policy "company members can view their own bid history"
  on public.bid_history for select
  to authenticated
  using (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- notifications — visible/markable-read only by the recipient company's
-- members. No authenticated-insert policy: only the security definer
-- trigger writes it.
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "company members can view their notifications"
  on public.notifications for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "company members can mark their notifications read"
  on public.notifications for update
  to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- company_votes — public read (vote counts are visible), but a user may
-- only create or remove *their own* vote. No update policy: an upvote is a
-- toggle (insert to add, delete to remove), never edited in place.
-- ---------------------------------------------------------------------------
alter table public.company_votes enable row level security;

create policy "company_votes are publicly readable"
  on public.company_votes for select
  using (true);

create policy "users can cast their own company vote"
  on public.company_votes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can remove their own company vote"
  on public.company_votes for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- battle_votes — public read; a user may only cast, change, or remove
-- *their own* vote. UNIQUE(battle_id, user_id) (votes migration) is what
-- actually enforces "one side per user per battle" — this just stops a user
-- from touching anyone else's row.
-- ---------------------------------------------------------------------------
alter table public.battle_votes enable row level security;

create policy "battle_votes are publicly readable"
  on public.battle_votes for select
  using (true);

create policy "users can cast their own battle vote"
  on public.battle_votes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can change their own battle vote"
  on public.battle_votes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can remove their own battle vote"
  on public.battle_votes for delete
  to authenticated
  using (user_id = auth.uid());
