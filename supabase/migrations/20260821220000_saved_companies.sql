-- Outbid: customer saved/favourite companies
--
-- Genuinely new domain, no existing table covers it. company_votes is the
-- closest precedent (also a simple user<->company join with a toggle UX),
-- but saved companies have different ownership semantics and are NOT
-- copied wholesale:
--
--   - company_votes is a PUBLIC signal (vote counts feed organic ranking,
--     so anyone can read who voted for what).
--   - saved_companies is a PRIVATE bookmark list — nobody but the owner
--     should ever be able to see what a user has saved. There is
--     deliberately no public/anon SELECT policy at all below.

create table public.saved_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, company_id)
);

-- Primary read pattern: "this user's saved companies, most recently saved
-- first" (the UNIQUE(user_id, company_id) index alone can't serve that
-- ordering). Mirrors reviews_company_idx's shape.
create index saved_companies_user_idx on public.saved_companies (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: entirely private to the owning user. A save is a toggle (insert to
-- add, delete to remove, same as company_votes) — no update policy, and
-- critically no select policy for anyone other than the owner, since this
-- list is nobody else's business, including other authenticated users.
-- ---------------------------------------------------------------------------
alter table public.saved_companies enable row level security;

create policy "users can view their own saved companies"
  on public.saved_companies for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can save a company"
  on public.saved_companies for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can unsave a company"
  on public.saved_companies for delete
  to authenticated
  using (user_id = auth.uid());
