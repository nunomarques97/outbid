-- Outbid Phase 3: billing domain foundations
--
-- Deliberately minimal: this is the landing spot the payments phase will
-- build on (Stripe customer/subscription linkage, invoices, etc.), not a
-- billing system. No payment processing, no invoice generation, no amounts
-- owed are computed or stored here — actual charges will eventually be
-- derived from bids/bid_history (a company owes, per period, the sum of
-- whatever it was actively bidding), which already exist and need nothing
-- added to support that later.

create table public.company_billing_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies (id) on delete cascade,
  billing_email text,
  currency text not null default 'EUR',
  -- 'inactive': no billing method on file yet (every company starts here,
  -- including all seed/demo companies). 'active' is set once the payments
  -- phase actually connects a real payment method — nothing in this phase
  -- ever flips it.
  status text not null default 'inactive' check (status in ('inactive', 'active')),
  -- Reserved for the payments phase (e.g. a Stripe customer id). Unused and
  -- unread by anything today.
  billing_provider_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger company_billing_profiles_set_updated_at
  before update on public.company_billing_profiles
  for each row execute function public.set_updated_at();

-- Every company gets exactly one billing profile, created alongside it —
-- unconditionally (unlike handle_new_company's owner-membership trigger,
-- this doesn't depend on auth.uid() being present, since it isn't a
-- membership grant to anyone; seed companies get one too, so "every company
-- has a billing profile" stays a simple, always-true invariant).
create or replace function public.handle_new_company_billing_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_billing_profiles (company_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_company_created_billing_profile
  after insert on public.companies
  for each row execute function public.handle_new_company_billing_profile();

-- ---------------------------------------------------------------------------
-- RLS: billing data is private to the company's own members — never public,
-- never writable by anyone outside owner/editor, and never touched by the
-- anon/public read policies the rest of the schema uses for browsable data.
-- ---------------------------------------------------------------------------
alter table public.company_billing_profiles enable row level security;

create policy "company members can view their own billing profile"
  on public.company_billing_profiles for select
  to authenticated
  using (public.is_company_member(company_id));

create policy "company members can update their own billing profile"
  on public.company_billing_profiles for update
  to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- No insert/delete policy for authenticated users: rows are created only by
-- the trigger above (security definer) and are never deleted directly —
-- they're removed via the companies FK's ON DELETE CASCADE.
