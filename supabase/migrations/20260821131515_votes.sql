-- Outbid Phase 3: voting
-- Two focused tables rather than one polymorphic votes(target_type, target_id)
-- table, so each can hold a real foreign key. The UNIQUE constraints below
-- are the actual enforcement mechanism for "one vote per user" — not app code.

-- ---------------------------------------------------------------------------
-- company_votes: a simple upvote. Organic ranking = companies.organic_votes_baseline
-- + count(company_votes) for that company. Completely independent of bids.
-- ---------------------------------------------------------------------------
create table public.company_votes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index company_votes_company_idx on public.company_votes (company_id);

-- ---------------------------------------------------------------------------
-- battle_votes: exactly one side per user per battle. The UNIQUE(battle_id,
-- user_id) constraint is what makes battle votes mutually exclusive at the
-- database level (mirrors the client-side voteBattle() exclusivity in
-- src/store/useSession.ts) — switching sides is an UPDATE of `side`, not a
-- second row.
-- ---------------------------------------------------------------------------
create table public.battle_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  created_at timestamptz not null default now(),
  unique (battle_id, user_id)
);

create index battle_votes_battle_idx on public.battle_votes (battle_id, side);
