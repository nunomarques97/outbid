-- Repcastr Phase 39: company verification + claim.
--
-- Design notes:
--
-- 1. Verification fields live in their OWN table (company_verifications),
--    not as columns on `companies`. `companies`' existing UPDATE policy
--    ("company members can update their company") is row-level only —
--    Postgres RLS has no column granularity, so any column added directly
--    to `companies` would be writable by any company owner/editor via a
--    plain PATCH, including a hypothetical `is_verified`. That is exactly
--    what this phase must not allow. Putting these fields in a separate
--    table with NO authenticated/anon write policy at all — writable only
--    through the SECURITY DEFINER RPCs below — closes that off entirely,
--    the same way `reports` (Phase 36) has no authenticated write policy
--    and `bid_payments`/`activate_bid_payment` (Phase 27B) restrict the
--    one function that flips a sensitive flag to service_role only.
--
-- 2. `companies` already supports an "unowned" company today — nothing
--    requires a `company_members` row to exist (confirmed live: 20 of the
--    22 companies on staging before this migration have zero members).
--    So a "claimable, unowned company" needs no schema change to become
--    possible — it already is. What's new here is the claim workflow
--    itself.
--
-- 3. A "claim" in this model IS the verification request — approving one
--    both grants ownership (via company_members, the one authoritative
--    membership mechanism — see Part 10) and marks the company verified,
--    atomically, in one SECURITY DEFINER RPC. There is no separate
--    "verify an already-owned company" flow in this phase; Part 4 scopes
--    claims to unowned companies only.

-- ---------------------------------------------------------------------------
-- 1. company_verifications — one row per company (created automatically,
--    see the trigger below), never automatically true.
-- ---------------------------------------------------------------------------
create table public.company_verifications (
  company_id uuid primary key references public.companies (id) on delete cascade,
  is_verified boolean not null default false,
  verified_at timestamptz,
  verification_method text check (verification_method in ('business_email', 'manual')),
  -- Free-text identifier of who/what approved this, not a FK to auth.users:
  -- the operator reviewing claims is not necessarily represented as an app
  -- user account, and this phase deliberately does not build an admin-user
  -- system (see Part 7's "do not build a full moderation/admin dashboard").
  verified_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_fields_consistent check (
    (is_verified = false and verified_at is null and verification_method is null)
    or (is_verified = true and verified_at is not null and verification_method is not null)
  )
);

create trigger company_verifications_set_updated_at
  before update on public.company_verifications
  for each row execute function public.set_updated_at();

alter table public.company_verifications enable row level security;

-- Public read: the Verified/Unverified badge is shown to every visitor,
-- signed in or not — this is identity/trust information about a public
-- business listing, not private data.
create policy "company_verifications are publicly readable"
  on public.company_verifications for select
  using (true);

-- Deliberately no insert/update/delete policy for anon or authenticated —
-- see approve_company_claim() below, the only path that ever changes
-- is_verified.

create or replace function public.handle_new_company_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_verifications (company_id) values (new.id);
  return new;
end;
$$;

create trigger on_company_created_init_verification
  after insert on public.companies
  for each row execute function public.handle_new_company_verification();

-- ---------------------------------------------------------------------------
-- 2. company_claims — a request that an unowned company's real
--    representative has come forward. Polymorphic-free (one real target
--    type: companies), same shape family as `reports` (Phase 36): the
--    claimant sees only their own claims, one pending claim per
--    (claimant, company) at a time, all writes go through RPCs.
-- ---------------------------------------------------------------------------
create table public.company_claims (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  claimant_user_id uuid not null references auth.users (id) on delete cascade,
  method text not null check (method in ('business_email', 'manual')),
  reason text not null,
  contact_email text,
  evidence text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index company_claims_company_idx on public.company_claims (company_id);
create index company_claims_claimant_idx on public.company_claims (claimant_user_id);

-- One pending claim per claimant per company — a resolved (approved/
-- rejected) claim doesn't permanently block a future attempt, mirroring
-- reports_reporter_target_pending_idx exactly.
create unique index company_claims_claimant_company_pending_idx
  on public.company_claims (claimant_user_id, company_id)
  where status = 'pending';

alter table public.company_claims enable row level security;

create policy "claimants can view their own claims"
  on public.company_claims for select
  to authenticated
  using (claimant_user_id = auth.uid());

-- No insert/update/delete policy for authenticated — create_company_claim()
-- and approve/reject_company_claim() below are the only write paths.

-- ---------------------------------------------------------------------------
-- 3. create_company_claim() — the only way a claim row is ever created.
--    Validates everything a raw insert + RLS check couldn't: that the
--    target actually exists, that it's genuinely unowned, and that the
--    claimant doesn't already manage a different company (Part 4/12 #12 —
--    checked here too, not just left to the one-company-per-user
--    constraint at approval time, so a doomed claim is rejected up front
--    with a clear message instead of silently sitting pending forever).
-- ---------------------------------------------------------------------------
create or replace function public.create_company_claim(
  p_company_id uuid,
  p_method text,
  p_reason text,
  p_contact_email text default null,
  p_evidence text default null
)
returns public.company_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.company_claims;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_method not in ('business_email', 'manual') then
    raise exception 'Invalid claim method' using errcode = '22023';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;

  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'Company not found' using errcode = '22023';
  end if;

  if exists (select 1 from public.company_members where company_id = p_company_id) then
    raise exception 'This company already has a representative' using errcode = '22023';
  end if;

  if exists (select 1 from public.company_members where user_id = auth.uid()) then
    raise exception 'You already manage a company — Repcastr supports one company per account' using errcode = '22023';
  end if;

  begin
    insert into public.company_claims (company_id, claimant_user_id, method, reason, contact_email, evidence)
    values (p_company_id, auth.uid(), p_method, trim(p_reason), p_contact_email, p_evidence)
    returning * into v_claim;
  exception
    when unique_violation then
      raise exception 'You already have a pending claim for this company' using errcode = '23505';
  end;

  return v_claim;
end;
$$;

revoke all on function public.create_company_claim(uuid, text, text, text, text) from public;
grant execute on function public.create_company_claim(uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. approve_company_claim() / reject_company_claim() — the only way a
--    claim's status or a company's verification state ever changes.
--    service_role only: there is no admin-user system in this phase (see
--    Part 7), so the operator reviews pending claims via direct database
--    access (same manual-inspection model already established for
--    `reports` in Phase 36) and calls these directly.
-- ---------------------------------------------------------------------------
create or replace function public.approve_company_claim(p_claim_id uuid, p_reviewed_by text default 'operator')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.company_claims;
begin
  select * into v_claim from public.company_claims where id = p_claim_id for update;
  if v_claim is null then
    raise exception 'Claim not found' using errcode = '22023';
  end if;
  if v_claim.status <> 'pending' then
    raise exception 'Claim is not pending' using errcode = '22023';
  end if;

  insert into public.company_members (company_id, user_id, role)
  values (v_claim.company_id, v_claim.claimant_user_id, 'owner');

  update public.company_verifications
  set is_verified = true,
      verified_at = now(),
      verification_method = v_claim.method,
      verified_by = p_reviewed_by
  where company_id = v_claim.company_id;

  update public.company_claims
  set status = 'approved', reviewed_at = now(), reviewed_by = p_reviewed_by
  where id = p_claim_id;
end;
$$;

create or replace function public.reject_company_claim(p_claim_id uuid, p_reviewed_by text default 'operator')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.company_claims
  set status = 'rejected', reviewed_at = now(), reviewed_by = p_reviewed_by
  where id = p_claim_id and status = 'pending';

  if not found then
    raise exception 'Claim not found or not pending' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.approve_company_claim(uuid, text) from public;
grant execute on function public.approve_company_claim(uuid, text) to service_role;

revoke all on function public.reject_company_claim(uuid, text) from public;
grant execute on function public.reject_company_claim(uuid, text) to service_role;
