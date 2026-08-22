-- Repcastr Phase 34.1: enforce category count [1, 2] at the database
-- level — Phase 34 only enforced the max-2 ceiling in the database; the
-- minimum-1 floor was application-only. This adds a real floor, safely.
--
-- Why a plain trigger can't just be extended to also check the minimum:
-- editing a company's categories (or any raw insert/delete bypass) does
-- the "remove old, add new" as separate statements/requests. An
-- IMMEDIATE trigger checking "count >= 1" would fire the instant the old
-- categories are removed — including in the middle of a legitimate edit
-- that was about to add new ones — and reject it. Both the max and the
-- new min check are converted to DEFERRABLE CONSTRAINT TRIGGERS, which
-- Postgres evaluates once at COMMIT rather than per statement, so only
-- the final state of a transaction is ever validated. A new
-- set_company_categories() RPC wraps a company's add+remove pair in one
-- transaction (one request) so the deferred checks see that final state
-- instead of two separate, individually-committed halves.

-- ---------------------------------------------------------------------------
-- 1. Audit gate: refuse to proceed if any company currently has zero
-- categories -- confirmed 0 via a live query immediately before this
-- migration was written; re-checked here so the migration itself is
-- self-verifying and never silently locks out a company that already
-- violates the floor it's about to add.
-- ---------------------------------------------------------------------------
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.companies c
  where not exists (select 1 from public.company_categories cc where cc.company_id = c.id);

  if v_count > 0 then
    raise exception 'Refusing to add a minimum-category constraint: % compan(y/ies) currently have zero categories.', v_count;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Replace the immediate max-2 trigger with a deferrable constraint
-- trigger (same rule, same errcode, just checked at commit instead of
-- per row).
-- ---------------------------------------------------------------------------
drop trigger company_categories_enforce_limit on public.company_categories;

create or replace function public.enforce_company_categories_max()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.company_categories where company_id = new.company_id) > 2 then
    raise exception 'A company may belong to at most 2 categories.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create constraint trigger company_categories_enforce_max
  after insert on public.company_categories
  deferrable initially deferred
  for each row execute function public.enforce_company_categories_max();

-- ---------------------------------------------------------------------------
-- 3. New: a deferrable constraint trigger enforcing the floor of 1,
-- checked on delete.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_company_categories_min()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.company_categories where company_id = old.company_id) < 1 then
    raise exception 'A company must belong to at least 1 category.' using errcode = '23514';
  end if;
  return old;
end;
$$;

create constraint trigger company_categories_enforce_min
  after delete on public.company_categories
  deferrable initially deferred
  for each row execute function public.enforce_company_categories_min();

-- ---------------------------------------------------------------------------
-- 4. set_company_categories(): the one place category membership is
-- written from the app from here on, so the add+remove pair always lands
-- in a single transaction and the deferred triggers above only ever see
-- the final, intended state. Existing direct-table RLS policies
-- (company_categories_write.sql) are left exactly as they are -- a raw
-- insert or delete still works and is still safely checked (each such
-- request is its own transaction, so the deferred trigger still runs at
-- its commit); this RPC exists so a normal category *edit* (remove some,
-- add others) never has to be split across two requests to stay correct.
-- ---------------------------------------------------------------------------
create or replace function public.set_company_categories(p_company_id uuid, p_category_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Not authorized to manage this company''s categories' using errcode = '42501';
  end if;

  if array_length(p_category_ids, 1) is null or array_length(p_category_ids, 1) < 1 then
    raise exception 'A company must belong to at least 1 category.' using errcode = '23514';
  end if;
  if array_length(p_category_ids, 1) > 2 then
    raise exception 'A company may belong to at most 2 categories.' using errcode = '23514';
  end if;

  insert into public.company_categories (company_id, category_id)
  select p_company_id, cid from unnest(p_category_ids) as cid
  on conflict do nothing;

  delete from public.company_categories
   where company_id = p_company_id
     and category_id <> all(p_category_ids);
end;
$$;

revoke all on function public.set_company_categories(uuid, uuid[]) from public;
grant execute on function public.set_company_categories(uuid, uuid[]) to authenticated;
