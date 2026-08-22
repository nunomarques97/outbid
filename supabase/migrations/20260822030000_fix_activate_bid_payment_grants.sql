-- The 20260822010000 revoke (`... FROM PUBLIC`) did not actually close
-- the gap — confirmed via a temporary diagnostic function
-- (has_function_privilege), which showed anon/authenticated still had
-- EXECUTE = true afterward. This Supabase project grants EXECUTE on new
-- public-schema functions to anon/authenticated directly (via default
-- privileges scoped to those roles by name), not via the PUBLIC
-- pseudo-role — so revoking FROM PUBLIC was a no-op. The fix is to
-- revoke from the actual roles that hold the grant.
revoke execute on function public.activate_bid_payment(uuid) from anon, authenticated;
grant execute on function public.activate_bid_payment(uuid) to service_role;

-- Remove the temporary diagnostic function from 20260822020000, its job
-- is done.
drop function if exists public.debug_check_privilege();
