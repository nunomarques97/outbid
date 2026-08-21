-- Outbid Phase 3: sellable placements + editorial/discovery content
-- placements, battles, deals, trends, trend_companies

-- ---------------------------------------------------------------------------
-- placements: sellable sponsored inventory. Ranking logic is never hardcoded
-- into a page — it is always derived from active bids at read time (see
-- bids_and_history migration + the client-side lib/ranking.ts helpers this
-- schema mirrors).
-- ---------------------------------------------------------------------------
create table public.placements (
  id uuid primary key default gen_random_uuid(),
  type text not null check (
    type in ('category_leaderboard', 'homepage_featured', 'comparison_sponsor', 'deal_spotlight')
  ),
  category_id uuid references public.categories (id) on delete cascade,
  name text not null,
  max_sponsored_slots int not null default 3 check (max_sponsored_slots > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- category_leaderboard placements are one-per-category...
  constraint placements_category_type_unique unique (type, category_id)
);

-- ...and every other placement type is a singleton (category_id is null for
-- those rows, and NULL values don't collide under a normal UNIQUE constraint,
-- so this partial index is what actually enforces "only one homepage_featured
-- / comparison_sponsor / deal_spotlight row").
create unique index placements_singleton_type_idx
  on public.placements (type)
  where category_id is null;

-- category_leaderboard placements must reference a category; every other
-- type must not.
alter table public.placements
  add constraint placements_category_id_matches_type check (
    (type = 'category_leaderboard' and category_id is not null)
    or (type <> 'category_leaderboard' and category_id is null)
  );

-- ---------------------------------------------------------------------------
-- battles: head-to-head company comparisons
-- ---------------------------------------------------------------------------
create table public.battles (
  id uuid primary key default gen_random_uuid(),
  company_a_id uuid not null references public.companies (id) on delete cascade,
  company_b_id uuid not null references public.companies (id) on delete cascade,
  -- Array of {label, aValue, bValue, winner}. Kept as jsonb rather than a
  -- child table: it's small, fixed-shape, always fetched together with the
  -- battle, and never queried independently — a join table here would add a
  -- join + explicit ordering column for no real benefit.
  criteria jsonb not null default '[]'::jsonb,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint battles_distinct_companies check (company_a_id <> company_b_id)
);

create index battles_company_a_idx on public.battles (company_a_id);
create index battles_company_b_idx on public.battles (company_b_id);

-- ---------------------------------------------------------------------------
-- deals: offers tied to a company
-- ---------------------------------------------------------------------------
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  discount_label text not null,
  description text not null,
  expires_at timestamptz not null,
  -- Seed/demo claim count. Real claim tracking (a deal_claims table) is
  -- intentionally out of scope this phase — see Phase 3 report.
  claim_count_baseline int not null default 0,
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);

create index deals_company_idx on public.deals (company_id);

-- ---------------------------------------------------------------------------
-- trends: editorial "what's happening" items, optionally tied to companies
-- ---------------------------------------------------------------------------
create table public.trends (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  trend_score int not null default 0,
  is_seed boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.trend_companies (
  trend_id uuid not null references public.trends (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  primary key (trend_id, company_id)
);

create index trend_companies_company_idx on public.trend_companies (company_id);
