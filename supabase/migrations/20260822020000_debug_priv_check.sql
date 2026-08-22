-- Temporary diagnostic — investigating why the REVOKE in
-- 20260822010000 didn't appear to take effect. Will be dropped by a
-- follow-up migration once resolved.
create or replace function public.debug_check_privilege()
returns table(role_name text, can_execute boolean)
language sql
security definer
as $$
  select r, has_function_privilege(r, 'public.activate_bid_payment(uuid)', 'EXECUTE')
  from unnest(array['anon', 'authenticated', 'service_role']) as r
$$;
