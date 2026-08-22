-- Outbid Phase 26: advertisers can set their own company's categories
--
-- company_categories has been "curated reference data... no
-- authenticated-write policy this phase (service role only)" since Phase 3
-- (rls_policies.sql) — which meant, in practice, that no real advertiser
-- creating a company through the product could ever get it into a
-- category. Every company visible in any category leaderboard/page today
-- got there only via seed.sql. This is the one missing write policy that
-- made that true; nothing else about categories changes (still curated,
-- still public-read, no authenticated-write policy on the categories
-- table itself).
--
-- No update policy: a company_categories row has no columns to change in
-- place (its primary key IS the (company_id, category_id) pair) —
-- reassigning a category is a delete + insert, which insert/delete alone
-- already support.

create policy "company members can assign their company's categories"
  on public.company_categories for insert
  to authenticated
  with check (public.is_company_member(company_id));

create policy "company members can remove their company's categories"
  on public.company_categories for delete
  to authenticated
  using (public.is_company_member(company_id));
