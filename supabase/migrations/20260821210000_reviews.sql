-- Outbid Phase 17: customer reviews + derived company ratings
--
-- Genuinely new domain, no existing table covers it. One review per
-- (company, user) — UNIQUE(company_id, user_id) below is the actual
-- enforcement mechanism, same pattern as company_votes/battle_votes
-- (supabase/migrations/*_votes.sql): edits are an UPDATE of the existing
-- row, never a second INSERT.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  -- Length bounds mirror REVIEW_TITLE_MIN/MAX and REVIEW_BODY_MIN/MAX in
  -- src/lib/supabase/mutations.ts — keep both in sync if either changes.
  -- btrim so a whitespace-only string can't sneak past a "not empty" check.
  title text not null check (char_length(btrim(title)) between 3 and 100),
  body text not null check (char_length(btrim(body)) between 10 and 3000),
  -- Snapshotted from profiles.display_name at insert time (see the trigger
  -- below) rather than joined at read time — avoids ever needing a public
  -- read policy on profiles (which today only allows self-read, and whose
  -- default display_name can be email-derived), while still giving every
  -- review a safe, human-readable author identity to render. A later rename
  -- doesn't retroactively rewrite past reviews, which is normal for a
  -- review platform.
  author_display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- Primary read pattern: "this company's reviews, newest first".
create index reviews_company_idx on public.reviews (company_id, created_at desc);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Always derive author_display_name server-side from the reviewer's own
-- profile — the client never supplies it, so there's no way to post a
-- review "as" a different display name than the authenticated user's own.
-- security definer so it can read profiles regardless of that table's own
-- (self-read-only) RLS.
-- ---------------------------------------------------------------------------
create or replace function public.set_review_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select display_name into new.author_display_name
  from public.profiles
  where id = new.user_id;

  if new.author_display_name is null then
    new.author_display_name := 'Outbid user';
  end if;

  return new;
end;
$$;

create trigger reviews_set_author_name
  before insert on public.reviews
  for each row execute function public.set_review_author_name();

-- ---------------------------------------------------------------------------
-- Defense in depth: even though the RLS UPDATE policy already requires
-- user_id = auth.uid() (so a user can only ever be updating a row they
-- already own), nothing stops that same authenticated client from trying to
-- change company_id or user_id ON that row via a raw .update() call — e.g.
-- reassigning their one review to a different company to dodge the
-- one-review-per-company constraint, or to bypass the "not a member of this
-- company" check that only runs on INSERT. Reject any attempt to change
-- either identity column; only rating/title/body are ever legitimately
-- editable.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_review_identity_change()
returns trigger
language plpgsql
as $$
begin
  if new.company_id <> old.company_id or new.user_id <> old.user_id then
    raise exception 'Cannot change the company or author of a review' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reviews_prevent_identity_change
  before update on public.reviews
  for each row execute function public.prevent_review_identity_change();

-- ---------------------------------------------------------------------------
-- RLS: public read (reviews ARE the public content), write restricted to
-- the review's own author. The insert policy additionally blocks a company
-- owner/editor from reviewing their own company — reusing is_company_member
-- (rls_policies.sql) rather than a second authorization mechanism — so a
-- company can't inflate its own rating from the inside. This is judged to
-- belong in this phase (not deferred moderation) because it's a single
-- WITH CHECK clause, not a moderation system, and "owners cannot manipulate
-- ratings" is an explicit requirement.
-- ---------------------------------------------------------------------------
alter table public.reviews enable row level security;

create policy "reviews are publicly readable"
  on public.reviews for select
  using (true);

create policy "authenticated users can review a company they don't manage"
  on public.reviews for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_company_member(company_id)
  );

create policy "users can edit their own review"
  on public.reviews for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can delete their own review"
  on public.reviews for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- company_rating_summary: the single source of truth for a company's
-- derived rating, so no component computes an average or distribution
-- itself. security_invoker means it runs under the querying role's own
-- permissions/RLS rather than the view owner's — harmless here since
-- reviews are fully public-read anyway, but it's the correct default.
-- A company with zero reviews has no row here at all (plain GROUP BY, no
-- LEFT JOIN from companies) — callers treat "no row" as "no reviews yet".
-- ---------------------------------------------------------------------------
create view public.company_rating_summary
with (security_invoker = true)
as
select
  r.company_id,
  count(*)::int as review_count,
  round(avg(r.rating)::numeric, 2)::float8 as average_rating,
  count(*) filter (where r.rating = 5)::int as rating_5_count,
  count(*) filter (where r.rating = 4)::int as rating_4_count,
  count(*) filter (where r.rating = 3)::int as rating_3_count,
  count(*) filter (where r.rating = 2)::int as rating_2_count,
  count(*) filter (where r.rating = 1)::int as rating_1_count
from public.reviews r
group by r.company_id;
