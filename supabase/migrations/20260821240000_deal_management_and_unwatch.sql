-- Outbid Phase 25: advertiser deal management + unwatch + deal destination URL
--
-- deals previously had public SELECT only — no advertiser could ever create
-- or edit a deal through the product; every deal in the database was seed
-- content. This adds the same "company member" write-policy shape every
-- other advertiser-owned table already uses (bids, company logos, etc.),
-- plus two additive columns:
--
--   - updated_at: same reason every other editable table has it (companies,
--     reviews, company_billing_profiles) — an edit UI without it would be a
--     regression from that established pattern.
--   - destination_url: optional, advertiser-settable link for the deal's
--     own landing page. Nullable — when absent, the frontend falls back to
--     the company's own website (Phase 21's original decision), so this is
--     additive, not a breaking change to how deals already resolve to a
--     destination. Stored the same way companies.website already is (bare
--     domain/path, no protocol) so the frontend can reuse the exact same
--     CompanyWebsiteLink component for both.
--
-- deal_claims's DELETE policy is new here too. Phase 19 deliberately
-- omitted it because a "claim" was a permanent record. The product
-- direction has since changed: watching a deal is a toggle (like a save),
-- not a permanent claim, so removing one's own watch must be possible. The
-- table/column names deliberately stay deal_claims — renaming an
-- already-applied table purely for a customer-facing terminology change is
-- exactly the "migration for cosmetics" this phase was told to avoid; the
-- frontend renames "claim" to "watch" everywhere a customer sees it, this
-- migration only adds the one new capability actually needed underneath.

alter table public.deals
  add column updated_at timestamptz not null default now(),
  add column destination_url text;

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create policy "company members can create their company's deals"
  on public.deals for insert
  to authenticated
  with check (public.is_company_member(company_id));

create policy "company members can update their company's deals"
  on public.deals for update
  to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

create policy "company members can delete their company's deals"
  on public.deals for delete
  to authenticated
  using (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- deal_claims: allow a user to remove their own watch. Still no policy lets
-- anyone touch another user's row, and the insert policy (expiry + not
-- self-company) is unchanged.
-- ---------------------------------------------------------------------------
create policy "users can remove their own watched deal"
  on public.deal_claims for delete
  to authenticated
  using (user_id = auth.uid());
