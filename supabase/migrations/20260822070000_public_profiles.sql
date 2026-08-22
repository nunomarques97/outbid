-- Outbid Phase 29: public customer profiles.
--
-- profiles today only supports self-read (id = auth.uid()) — there is no
-- way for anyone to see anyone else's profile, and reviews only ever show
-- a snapshotted author_display_name specifically to avoid needing a public
-- read policy here (see reviews.sql). A real public profile page needs
-- profiles to be readable by others, at least for users who opt in.
--
-- This migration:
--   1. Adds username (stable, human-readable, auto-generated — never
--      user-editable this phase), bio, avatar_path, is_public to profiles.
--   2. Backfills a unique username for every existing profile.
--   3. Extends handle_new_user() to generate one for every new signup.
--   4. Widens profiles' SELECT policy to allow public read when
--      is_public = true, alongside the existing always-allowed self-read.
--   5. Adds user_interests (many-to-many, reuses the existing categories
--      table — no new category concept).
--   6. Adds a user-avatars storage bucket, readable when the owning
--      profile is public or by the owner, writable only by the owner.
--   7. Adds reviews_user_idx — reviews had no index usable for "all of
--      this user's reviews, newest first" (the only existing one starts
--      with company_id), and the public profile's paginated review list
--      needs exactly that access pattern.

-- ---------------------------------------------------------------------------
-- 1. profiles: new columns.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column username text,
  add column bio text,
  add column avatar_path text,
  add column is_public boolean not null default true;

alter table public.profiles
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 500);

-- ---------------------------------------------------------------------------
-- 2. Username generation + backfill.
--
-- Not user-editable this phase (see Part 4 of the phase brief — display
-- name, avatar, bio, interests are editable; username isn't in that
-- list). Auto-generated from display_name so every user has a working
-- profile URL immediately, existing and new.
-- ---------------------------------------------------------------------------
create or replace function public.generate_unique_username(p_seed text)
returns text
language plpgsql
as $$
declare
  base text;
  candidate text;
  suffix int := 0;
begin
  base := lower(regexp_replace(coalesce(nullif(btrim(p_seed), ''), 'user'), '[^a-z0-9]+', '', 'g'));
  base := left(base, 20);
  if base = '' or char_length(base) < 2 then
    base := 'user';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base || suffix::text;
  end loop;

  return candidate;
end;
$$;

-- One row at a time (not a single bulk UPDATE) so each call sees every
-- previously-assigned username in this same backfill — a bulk UPDATE
-- would evaluate every row's SET expression against the same pre-update
-- snapshot and could hand out duplicate usernames to rows sharing a
-- display_name.
do $$
declare
  r record;
begin
  for r in select id, display_name from public.profiles where username is null order by created_at loop
    update public.profiles set username = public.generate_unique_username(r.display_name) where id = r.id;
  end loop;
end;
$$;

alter table public.profiles
  add constraint profiles_username_format check (username ~ '^[a-z0-9_]{2,30}$'),
  alter column username set not null;

create unique index profiles_username_idx on public.profiles (username);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  insert into public.profiles (id, display_name, username)
  values (new.id, v_display_name, public.generate_unique_username(v_display_name));
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS: allow public read when is_public, self-read always. Nothing
-- sensitive lives in profiles (email stays in auth.users, never copied
-- here), so a plain row-level OR is sufficient — no column-level split
-- needed.
-- ---------------------------------------------------------------------------
drop policy "profiles are self-readable" on public.profiles;

create policy "profiles are self-readable or public"
  on public.profiles for select
  using (id = auth.uid() or is_public = true);

-- profiles are self-updatable (existing policy) is untouched — still the
-- only way to write username/bio/avatar_path/is_public, and username
-- isn't exposed as editable in the app regardless of what RLS permits.

-- ---------------------------------------------------------------------------
-- 4. user_interests: many-to-many against the existing categories table.
-- Toggled (insert to add, delete to remove), never edited in place — same
-- pattern as company_votes/battle_votes.
-- ---------------------------------------------------------------------------
create table public.user_interests (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table public.user_interests enable row level security;

create policy "users can view their own interests"
  on public.user_interests for select
  to authenticated
  using (user_id = auth.uid());

create policy "public can view interests of public profiles"
  on public.user_interests for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = user_interests.user_id and p.is_public = true
    )
  );

create policy "users can add their own interests"
  on public.user_interests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can remove their own interests"
  on public.user_interests for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Storage: user-avatars, separate bucket from company-logos on purpose
-- (different owner concept, different RLS predicate — is_public gating
-- has no equivalent for companies, which are always public). Objects are
-- stored at "<user_id>/<random>.<ext>", mirroring company-logos exactly.
--
-- PRIVATE bucket (public = false) — this is the one deliberate difference
-- from company-logos, and it matters: Supabase serves a `public = true`
-- bucket's objects via a route (/storage/v1/object/public/...) that
-- bypasses Storage RLS entirely, for anyone, with no auth of any kind.
-- Confirmed live against the (correctly public) company-logos bucket
-- during Phase 29.1's audit: a real object was fetched with zero request
-- headers at all and returned 200. Had user-avatars been left public, the
-- SELECT policy below would never be consulted for reads, and a private
-- profile's avatar would remain fetchable by anyone who knew or guessed
-- its path — RLS alone cannot make a public bucket's objects private.
-- With the bucket private, reads only happen through paths Storage does
-- check RLS for: createSignedUrl()/createSignedUrls() (what the frontend
-- now uses — see getAvatarUrl/getSignedAvatarUrls in queries.ts) or an
-- authenticated direct fetch. The policy below is what actually gates
-- both of those.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', false)
on conflict (id) do nothing;

create policy "avatars are readable by their owner or when the profile is public"
  on storage.objects for select
  using (
    bucket_id = 'user-avatars'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.profiles p
        where p.id::text = (storage.foldername(name))[1] and p.is_public = true
      )
    )
  );

create policy "users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can remove their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 6. reviews_user_idx: "all of this user's reviews, newest first" had no
-- usable index — the only existing one (reviews_company_idx) leads with
-- company_id. The public profile's paginated review list is exactly this
-- access pattern, and it needs to work for any user, not just the
-- signed-in one (whose review count is small today but shouldn't be
-- assumed to stay that way).
-- ---------------------------------------------------------------------------
create index reviews_user_idx on public.reviews (user_id, created_at desc);
