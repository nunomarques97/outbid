-- Repcastr Phase 33: broad, general-purpose category taxonomy (v1) +
-- multi-category enforcement.
--
-- Strategy: the 4 existing category rows map 1:1 onto 4 of the new broad
-- categories, so they are renamed IN PLACE (same id) rather than replaced.
-- This preserves every company_categories row, every category_leaderboard
-- placement, and every bid on those placements — including two currently
-- ACTIVE staging bids (test company2: EUR 870 on the old "Fitness Apps"
-- placement, EUR 180 on the old "Coffee Roasters" placement) and one more
-- on Test Company (EUR 70 on the old "Web Hosting" placement) — with zero
-- data loss and zero reassignment required.
--
--   Project Management Tools -> Software
--   Web Hosting              -> Technology
--   Coffee Roasters          -> Coffee
--   Fitness Apps             -> Fitness
--
-- 18 new broad categories are inserted alongside these 4, each with its
-- own category_leaderboard placement, so every category is immediately
-- browsable and bid-ready (see placements_category_type_unique in
-- content_schema.sql for the existing one-placement-per-category rule this
-- reuses unchanged).

-- ---------------------------------------------------------------------------
-- 1. Rename the 4 existing categories in place.
-- ---------------------------------------------------------------------------
update public.categories set slug = 'software', name = 'Software', icon = 'AppWindow',
  description = 'Apps, platforms, and developer tools businesses build and run on.'
  where slug = 'project-management-tools';

update public.categories set slug = 'technology', name = 'Technology', icon = 'Cpu',
  description = 'Computing, infrastructure, hosting, and IT.'
  where slug = 'web-hosting';

update public.categories set slug = 'coffee', name = 'Coffee', icon = 'Coffee',
  description = 'Roasters, cafes, and coffee subscriptions.'
  where slug = 'coffee-roasters';

update public.categories set slug = 'fitness', name = 'Fitness', icon = 'Dumbbell',
  description = 'Gyms, training, and fitness apps.'
  where slug = 'fitness-apps';

-- Keep the stored placement label in sync. getPlacementDisplayName()
-- recomputes this from categories.name at read time for category_leaderboard
-- placements and ignores this column, but there's no reason to leave it stale.
update public.placements p set name = c.name || ' Leaderboard'
  from public.categories c
  where p.category_id = c.id and p.type = 'category_leaderboard'
    and c.slug in ('software', 'technology', 'coffee', 'fitness');

-- ---------------------------------------------------------------------------
-- 2. Insert the remaining broad v1 categories.
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, icon, description) values
  ('business-professional-services', 'Business & Professional Services', 'Briefcase', 'Consulting, agencies, and services businesses hire other businesses for.'),
  ('finance', 'Finance', 'Landmark', 'Banking, payments, investing, and insurance.'),
  ('food-dining', 'Food & Dining', 'UtensilsCrossed', 'Restaurants, cafes, and places to eat.'),
  ('shopping-retail', 'Shopping & Retail', 'ShoppingBag', 'Online and brick-and-mortar retail.'),
  ('fashion', 'Fashion', 'Shirt', 'Clothing, footwear, and accessories.'),
  ('health', 'Health', 'HeartPulse', 'Healthcare, wellness, and medical services.'),
  ('beauty-personal-care', 'Beauty & Personal Care', 'Sparkles', 'Skincare, cosmetics, and grooming.'),
  ('travel', 'Travel', 'Plane', 'Flights, hotels, and trip planning.'),
  ('automotive', 'Automotive', 'Car', 'Cars, car care, and mobility.'),
  ('home-living', 'Home & Living', 'Home', 'Furniture, home goods, and home services.'),
  ('real-estate', 'Real Estate', 'Building2', 'Buying, renting, and property services.'),
  ('education', 'Education', 'GraduationCap', 'Learning platforms, courses, and tutoring.'),
  ('entertainment', 'Entertainment', 'Clapperboard', 'Streaming, gaming, and media.'),
  ('media-news', 'Media & News', 'Newspaper', 'Publishers, journalism, and content platforms.'),
  ('sports', 'Sports', 'Trophy', 'Teams, gear, and sports brands.'),
  ('pets', 'Pets', 'PawPrint', 'Pet care, products, and services.'),
  ('kids-family', 'Kids & Family', 'Baby', 'Childcare, toys, and family services.'),
  ('nonprofit-community', 'Nonprofit & Community', 'HeartHandshake', 'Charities and community organizations.');

-- One category_leaderboard placement per newly-inserted category. Every
-- category is browsable and bid-ready from the moment it exists, even with
-- zero companies — empty categories are future commercial opportunities,
-- not something to hide (see Phase 33 Part 12).
insert into public.placements (type, category_id, name, max_sponsored_slots)
select 'category_leaderboard', id, name || ' Leaderboard', 3
from public.categories
where slug in (
  'business-professional-services', 'finance', 'food-dining', 'shopping-retail', 'fashion',
  'health', 'beauty-personal-care', 'travel', 'automotive', 'home-living', 'real-estate',
  'education', 'entertainment', 'media-news', 'sports', 'pets', 'kids-family', 'nonprofit-community'
);

-- ---------------------------------------------------------------------------
-- 3. Enforce a maximum of 5 categories per company at the database level --
-- mirrors the one-company-per-user precedent (20260822080000): a business
-- rule that must hold even if the frontend is bypassed, not just hinted at
-- in the UI. There is deliberately no equivalent "at least one" trigger:
-- company creation and category assignment are two separate client
-- round-trips (same shape as today), so a hard DB-level minimum would
-- either be unenforceable across that gap or require rebuilding company
-- creation as a single atomic RPC -- a bigger change than this phase's
-- category work calls for, and one that would need to re-derive the
-- one-company-per-user RLS check inside a SECURITY DEFINER function to
-- avoid quietly weakening it. "At least one" is enforced at the
-- application layer instead: required to submit the create-company form,
-- and EditCompanyDialog visibly flags a company with zero categories.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_company_categories_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.company_categories where company_id = new.company_id) > 5 then
    raise exception 'A company may belong to at most 5 categories.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger company_categories_enforce_limit
  after insert on public.company_categories
  for each row execute function public.enforce_company_categories_limit();

-- ---------------------------------------------------------------------------
-- 4. Staging QA data: assign the 3 real (non-seed) test companies a
-- category each, using their EXISTING active bids as the guide so nothing
-- about their bid history needs to change. Authorized by Phase 33 Part 7.
-- ---------------------------------------------------------------------------
-- Test Company already holds an active EUR 70 bid on the old Web Hosting
-- (now Technology) placement -- Technology is its natural primary category;
-- Software is added purely to exercise multi-category.
insert into public.company_categories (company_id, category_id)
select c.id, cat.id from public.companies c, public.categories cat
where c.slug = 'test-company' and cat.slug in ('technology', 'software')
on conflict do nothing;

-- test company2 already holds two ACTIVE bids -- EUR 870 on the old Fitness
-- Apps (now Fitness) placement and EUR 180 on the old Coffee Roasters (now
-- Coffee) placement. Assigning exactly those two categories means its
-- existing bid history already demonstrates "different bids in different
-- categories" with zero new bids needed.
insert into public.company_categories (company_id, category_id)
select c.id, cat.id from public.companies c, public.categories cat
where c.slug = 'test-company2' and cat.slug in ('fitness', 'coffee')
on conflict do nothing;

-- gdww2 has no bid history (orphaned during the Phase 31.2 one-company-per-
-- user cleanup) -- a single reasonable default category so it isn't left
-- invisible to category discovery.
insert into public.company_categories (company_id, category_id)
select c.id, cat.id from public.companies c, public.categories cat
where c.slug = 'gdww2' and cat.slug = 'business-professional-services'
on conflict do nothing;
