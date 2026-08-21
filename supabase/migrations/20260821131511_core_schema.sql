-- Outbid Phase 3: core schema
-- profiles, companies, company_members, categories, company_categories

create extension if not exists pgcrypto;

-- Generic "touch updated_at" trigger helper, reused by every table below that has one.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row (created automatically, see rpc_functions migration)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- companies: a public business profile, independent of any advertising activity
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  initials text not null,
  logo_color text not null,
  tagline text not null,
  description text not null,
  website text not null,
  founded_year int not null,
  -- Seed/demo vote count a company "starts" with. Real organic rank = this
  -- baseline + count(company_votes) for the company (mirrors the exact
  -- base+delta shape lib/ranking.ts already uses client-side).
  organic_votes_baseline int not null default 0,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- company_members: who can manage a company, and at what level
-- ---------------------------------------------------------------------------
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- The UNIQUE(company_id, user_id) constraint above already indexes
-- company_id-first lookups ("who are this company's members"). This covers
-- the reverse direction ("which companies does this user belong to") —
-- needed once the dashboard is driven by a real signed-in user instead of a
-- hardcoded demo company, not used by anything yet.
create index company_members_user_idx on public.company_members (user_id);

-- ---------------------------------------------------------------------------
-- categories: the discovery taxonomy (e.g. "Web Hosting")
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- company_categories: many-to-many, replaces the mock's categoryIds[] array
-- with a real, queryable, FK-constrained relation.
-- ---------------------------------------------------------------------------
create table public.company_categories (
  company_id uuid not null references public.companies (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (company_id, category_id)
);

create index company_categories_category_idx on public.company_categories (category_id);
