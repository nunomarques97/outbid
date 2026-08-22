-- Repcastr Phase 34: one global bid per company + a consolidated,
-- broader v2 category taxonomy.
--
-- Two corrections to the Phase 33 model:
--
-- 1. Categories were still too fragmented (Coffee alongside Food & Dining,
--    Software alongside Technology, etc). This migration consolidates 22
--    categories down to 13 broad ones. Categories being merged away are
--    ARCHIVED, never deleted: public.bid_payments.placement_id has
--    `on delete cascade` back through placements -> categories, and the
--    "Coffee" category's placement holds a REAL Stripe payment record
--    (EUR 180). Deleting any category row would risk cascading into real
--    payment history. Archiving (a new is_archived flag) removes a
--    category from every customer-facing listing while leaving its row,
--    its placement, its bids, and its bid_payments completely intact.
--
-- 2. Bidding moves from "one bid per company per category" to "one
--    active bid per company, period" -- categories now only determine
--    where that single bid is eligible to appear. A new singleton
--    placement (type='global_sponsored') is the only place a company can
--    hold an active bid going forward. Existing category-scoped bids are
--    consolidated onto it (amount = the highest of a company's existing
--    active category bids -- matches what they already legitimately paid
--    for) and the old per-category bids are marked 'withdrawn', never
--    deleted, so bid_history and bid_payments stay exactly as they were.
--
-- Nothing in supabase/functions/create-bid-payment, place_bid(), or
-- activate_bid_payment() needs to change: all three are already
-- placement-agnostic (see Phase 34 audit) -- pointing the frontend at the
-- one new placement id is the only wiring required.

-- ---------------------------------------------------------------------------
-- 1. Archive, don't delete.
-- ---------------------------------------------------------------------------
alter table public.categories add column is_archived boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Rename the categories that survive as-is onto the final v2 taxonomy.
-- (technology, business-professional-services, finance, food-dining,
-- travel, automotive, home-living, real-estate, education, entertainment
-- already match the v2 taxonomy from Phase 33 and need no change.)
-- ---------------------------------------------------------------------------
update public.categories set slug = 'shopping', name = 'Shopping',
  description = 'Online and brick-and-mortar retail.'
  where slug = 'shopping-retail';

update public.categories set slug = 'health-fitness', name = 'Health & Fitness',
  description = 'Healthcare, wellness, gyms, and fitness.'
  where slug = 'fitness';

update public.categories set slug = 'media', name = 'Media',
  description = 'Publishers, journalism, streaming, and content.'
  where slug = 'media-news';

-- ---------------------------------------------------------------------------
-- 3. Merge the remaining 9 categories into a surviving target: remap
-- every company_categories / user_interests row off the old category
-- first (insert-onto-target then delete-from-old, deduped via ON
-- CONFLICT so a company/user already in both ends up counted once), then
-- archive the now-unreferenced row.
-- ---------------------------------------------------------------------------
do $$
declare
  pair record;
  v_old_id uuid;
  v_new_id uuid;
begin
  for pair in
    select * from (values
      ('software', 'technology'),
      ('coffee', 'food-dining'),
      ('fashion', 'shopping'),
      ('beauty-personal-care', 'shopping'),
      ('health', 'health-fitness'),
      ('pets', 'home-living'),
      ('kids-family', 'home-living'),
      ('sports', 'entertainment'),
      ('nonprofit-community', 'business-professional-services')
    ) as t(old_slug, new_slug)
  loop
    select id into v_old_id from public.categories where slug = pair.old_slug;
    select id into v_new_id from public.categories where slug = pair.new_slug;

    insert into public.company_categories (company_id, category_id)
    select company_id, v_new_id from public.company_categories where category_id = v_old_id
    on conflict do nothing;
    delete from public.company_categories where category_id = v_old_id;

    insert into public.user_interests (user_id, category_id)
    select user_id, v_new_id from public.user_interests where category_id = v_old_id
    on conflict do nothing;
    delete from public.user_interests where category_id = v_old_id;

    update public.categories set is_archived = true where id = v_old_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Max categories per company: 5 -> 2 (Phase 34 Part 3). Minimum-one
-- stays application-enforced only, same reasoning as Phase 33.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_company_categories_limit()
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

-- ---------------------------------------------------------------------------
-- 5. The one global placement every company's single active bid lives on.
-- placements_singleton_type_idx (content_schema.sql: unique on (type)
-- where category_id is null) already guarantees only one row of this
-- type can ever exist -- no new constraint needed for that.
-- ---------------------------------------------------------------------------
alter table public.placements drop constraint placements_type_check;
alter table public.placements add constraint placements_type_check
  check (type in ('category_leaderboard', 'homepage_featured', 'comparison_sponsor', 'deal_spotlight', 'global_sponsored'));

insert into public.placements (type, category_id, name, max_sponsored_slots)
values ('global_sponsored', null, 'Global Sponsored Bid', 9999);

-- Category-scoped placements no longer accept bids -- defense in depth
-- alongside the frontend no longer offering them as a bid target.
update public.placements set is_active = false where type = 'category_leaderboard';

-- ---------------------------------------------------------------------------
-- 6. Consolidate existing per-category active bids onto the global
-- placement: one new bid per company, amount = the highest of that
-- company's existing active category bids. The old category bids are
-- withdrawn (status only -- amount is untouched, so this does not fire
-- bids_record_history), never deleted.
-- ---------------------------------------------------------------------------
do $$
declare
  v_global_placement_id uuid;
  co record;
begin
  select id into v_global_placement_id from public.placements where type = 'global_sponsored';

  for co in
    select b.company_id, max(b.amount) as global_amount
    from public.bids b
    join public.placements p on p.id = b.placement_id
    where p.type = 'category_leaderboard' and b.status = 'active'
    group by b.company_id
  loop
    insert into public.bids (company_id, placement_id, amount, status)
    values (co.company_id, v_global_placement_id, co.global_amount, 'active');

    update public.bids
       set status = 'withdrawn'
     where company_id = co.company_id
       and placement_id in (select id from public.placements where type = 'category_leaderboard')
       and status = 'active';
  end loop;
end;
$$;
