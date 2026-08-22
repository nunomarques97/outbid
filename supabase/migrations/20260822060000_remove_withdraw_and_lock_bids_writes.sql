-- Outbid Phase 28.1: withdrawal is no longer a customer-facing action, and
-- direct client writes to `bids` are closed off entirely.
--
-- OUTBID bids are one-way financial commitments — once paid, a bid can
-- only be raised, never lowered or withdrawn. The application no longer
-- calls withdraw_bid() anywhere (see mutations.ts / useDashboardBids.ts /
-- BidAdjustControl.tsx), but two things kept it — or an equivalent
-- bypass — reachable regardless of what the UI does:
--
-- 1. withdraw_bid() itself was still directly callable by any
--    authenticated company member (its explicit grant, from the
--    rpc_functions migration, was never revoked).
--
-- 2. bids' own INSERT/UPDATE RLS policies (rls_policies migration) had no
--    column restriction at all: `with check (is_company_member(company_id))`
--    lets a company member write ANY column directly via
--    `supabase.from('bids').update(...)` — including status='withdrawn',
--    a lowered amount, or a raised amount with no payment — completely
--    bypassing place_bid()'s validation. This was never withdrawal-
--    specific; it undermined every payment-gating rule from Phase 27B
--    onward, and is a more direct route to "withdrawal" than the RPC
--    ever was.
--
-- Every legitimate write to `bids` already goes through place_bid() or
-- activate_bid_payment() — both SECURITY DEFINER, so they don't need (and
-- never needed) these policies to function; SECURITY DEFINER functions
-- run as the function owner and bypass RLS regardless. Dropping the
-- INSERT/UPDATE policies removes a pathway the app never legitimately
-- used and closes exactly the kind of silent-inconsistent-state gap this
-- phase is about.
--
-- withdraw_bid() itself is deliberately NOT dropped: it's the only thing
-- that produced any existing 'withdrawn' rows, dropping it has no
-- benefit over revoking its grant, and revoking is trivially reversible.
-- No existing bids/bid_history/bid_payments rows are touched by this
-- migration — historical 'withdrawn' rows are preserved as-is.

revoke execute on function public.withdraw_bid(uuid, uuid) from authenticated;

drop policy "company members can create their company's bids" on public.bids;
drop policy "company members can update their company's bids" on public.bids;

-- "bids are publicly readable" (select, using (true)) is untouched —
-- transparent bidding remains the product's whole point.
