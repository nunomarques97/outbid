-- Outbid Phase 19: real deal claims
--
-- deals.claim_count_baseline has said since Phase 3 that "real claim
-- tracking (a deal_claims table) is intentionally out of scope this
-- phase" (see content_schema.sql) — this is that table.
--
-- A claim is a permanent record of customer interest, not a purchase and
-- not a toggle like a vote/save: there is deliberately no UPDATE or DELETE
-- policy below, because nothing in the product ever needs to "unclaim."

create table public.deal_claims (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

-- "This user's claimed deals, most recent first" (mirrors saved_companies_user_idx).
create index deal_claims_user_idx on public.deal_claims (user_id, created_at desc);
-- Backs the aggregate view below.
create index deal_claims_deal_idx on public.deal_claims (deal_id);

-- ---------------------------------------------------------------------------
-- RLS: entirely private to the owning user, same shape as saved_companies —
-- no policy lets anyone read another user's claims, including other
-- authenticated users.
--
-- The insert policy additionally requires the target deal to exist, still
-- be open (not expired), and NOT belong to a company the claiming user is
-- a member of — the last part directly satisfies "company owners/members
-- must not be able to manipulate their own company's deal claims to
-- artificially inflate customer activity," reusing is_company_member()
-- rather than a second authorization mechanism (same pattern as reviews
-- blocking a company from reviewing itself).
-- ---------------------------------------------------------------------------
alter table public.deal_claims enable row level security;

create policy "users can view their own claims"
  on public.deal_claims for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can claim an open deal from a company they don't manage"
  on public.deal_claims for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.deals d
      where d.id = deal_id
        and d.expires_at > now()
        and not public.is_company_member(d.company_id)
    )
  );

-- ---------------------------------------------------------------------------
-- deal_claim_counts: a public aggregate, deliberately NOT security_invoker
-- (unlike company_rating_summary). reviews are already public-read, so
-- security_invoker made no functional difference there. deal_claims is
-- private, so this view must run as its owner to see and count every
-- user's claims — while its output only ever exposes (deal_id,
-- claim_count), never user_id, so no individual claim is ever exposed
-- publicly.
-- ---------------------------------------------------------------------------
create view public.deal_claim_counts as
select deal_id, count(*)::int as claim_count
from public.deal_claims
group by deal_id;
