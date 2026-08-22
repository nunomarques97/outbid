-- Phase 27B follow-up, found via live anonymous-REST verification right
-- after the bid_payments migration was applied: activate_bid_payment(uuid)
-- was reachable via PostgREST despite having no explicit grant. This
-- project does not revoke PostgreSQL's default PUBLIC execute privilege
-- on newly created functions, so "no grant statement" is NOT the same as
-- "inaccessible" here — confirmed by calling it anonymously and getting
-- the function's own internal error ("Payment not found"), not a
-- permission error, meaning the call actually executed.
--
-- Left as-is, this was a real bypass: activate_bid_payment() does no
-- authorization check of its own (by design — it's meant to run only
-- from the trusted webhook, after Stripe has already confirmed payment).
-- Any authenticated company member can legitimately read their own
-- pending bid_payments.id via the existing SELECT policy, then call this
-- function directly with that id to activate their bid without ever
-- paying. Explicitly revoking is the only way to actually close this.
revoke execute on function public.activate_bid_payment(uuid) from public;
grant execute on function public.activate_bid_payment(uuid) to service_role;
