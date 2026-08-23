-- Repcastr Phase 36: lightweight trust & safety report intake.
--
-- Not a moderation system -- there is no admin dashboard, no automated
-- review, no status-change UI. This is a durable, safely-writable record
-- of "a user flagged this," inspected manually (direct database access)
-- until a real moderation tool exists. Polymorphic target_type/target_id
-- (no per-type FK) is deliberate here, unlike elsewhere in this schema:
-- a report should survive even if its target is later deleted, and the
-- three target tables (reviews/companies/deals) have nothing else in
-- common to join through.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('review', 'company', 'deal')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'fake_or_misleading', 'harassment', 'illegal_content', 'impersonation', 'other')),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

create index reports_target_idx on public.reports (target_type, target_id);
create index reports_reporter_idx on public.reports (reporter_user_id, created_at desc);

-- One PENDING report per (reporter, target) at a time -- not a lifetime
-- cap: once a report is reviewed/resolved/dismissed, the same reporter can
-- file a new one if the problem continues. This is the actual duplicate
-- guard (Phase 36 Part 12), enforced structurally rather than in application code.
create unique index reports_reporter_target_pending_idx
  on public.reports (reporter_user_id, target_type, target_id)
  where status = 'pending';

alter table public.reports enable row level security;

-- Reporters can see their own report history. No SELECT policy exists for
-- anyone else's reports, and no UPDATE/DELETE policy exists for anyone --
-- a report, once filed, cannot be altered or withdrawn by its author, and
-- status changes are not reachable through the API at all yet (see
-- create_report() below for the only write path).
create policy "users can view their own reports"
  on public.reports for select
  to authenticated
  using (reporter_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- create_report(): the only way a report row is ever created. Validates
-- target_type/reason against the same enums as the CHECK constraints
-- (defense in depth, and a clean error message instead of a raw
-- constraint-violation), confirms the target actually exists (so the
-- table stays a meaningful record, not free-form junk), and relies on
-- reports_reporter_target_pending_idx for duplicate rejection.
-- ---------------------------------------------------------------------------
create or replace function public.create_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_description text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.reports;
  v_target_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'Sign in to submit a report' using errcode = '42501';
  end if;

  if p_target_type not in ('review', 'company', 'deal') then
    raise exception 'Invalid report target type' using errcode = '22023';
  end if;

  if p_reason not in ('spam', 'fake_or_misleading', 'harassment', 'illegal_content', 'impersonation', 'other') then
    raise exception 'Invalid report reason' using errcode = '22023';
  end if;

  case p_target_type
    when 'review' then
      select exists(select 1 from public.reviews where id = p_target_id) into v_target_exists;
    when 'company' then
      select exists(select 1 from public.companies where id = p_target_id) into v_target_exists;
    when 'deal' then
      select exists(select 1 from public.deals where id = p_target_id) into v_target_exists;
  end case;

  if not v_target_exists then
    raise exception 'Report target not found' using errcode = '22023';
  end if;

  begin
    insert into public.reports (reporter_user_id, target_type, target_id, reason, description)
    values (auth.uid(), p_target_type, p_target_id, p_reason, nullif(btrim(coalesce(p_description, '')), ''))
    returning * into v_report;
  exception when unique_violation then
    raise exception 'You already have a pending report for this' using errcode = '23505';
  end;

  return v_report;
end;
$$;

revoke all on function public.create_report(text, uuid, text, text) from public;
grant execute on function public.create_report(text, uuid, text, text) to authenticated;
