// Outbid Phase 27B — starts a one-time Stripe payment for a new or raised
// bid. This is the ONLY entry point that may create a bid_payments row or
// a Stripe Checkout Session; the browser never talks to Stripe directly.
//
// What this does NOT do: it never marks a payment succeeded and never
// touches the `bids` table. That happens exclusively in stripe-webhook,
// once Stripe itself confirms the payment — this function only sets up
// the attempt and hands the caller a Checkout URL to redirect to.
//
// Auth model: verify_jwt is on for this function (see supabase/config.toml),
// so Supabase has already confirmed the caller holds a valid session before
// this code runs. This function additionally re-derives the same
// authorization the rest of the app uses — "is this user an owner/editor of
// the target company" — by querying company_members AS the caller (using
// their forwarded JWT, not the service key), so the exact same RLS-backed
// check every other write in this project relies on also gates this one.
// Only after that check passes does it switch to the service-role client
// for the actual writes, since clients have no insert grant on
// bid_payments by design.
//
// Charge amount (Phase 27B.1): the client sends only the TARGET bid
// amount it wants to end up at — never a charge amount. This function is
// the sole place that computes what Stripe actually charges:
// max(target - current, 0), where `current` is this company's own active
// bid on this placement, read fresh from the database (not from
// anything the client supplied). The browser cannot influence the charge
// beyond choosing the target.
import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  companyId: string
  placementId: string
  targetAmount: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    // Scoped to the caller's own JWT — used only to find out who they are
    // and what they're a member of, never for writes.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await callerClient.auth.getUser()
    if (!user) {
      return jsonResponse({ error: 'Not authenticated' }, 401)
    }

    const body = (await req.json()) as Partial<RequestBody>
    const { companyId, placementId, targetAmount } = body
    if (
      !companyId ||
      !placementId ||
      typeof targetAmount !== 'number' ||
      !Number.isFinite(targetAmount) ||
      !(targetAmount > 0)
    ) {
      return jsonResponse({ error: 'companyId, placementId and a positive, finite targetAmount are required' }, 400)
    }

    const { data: membership } = await callerClient
      .from('company_members')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership || !['owner', 'editor'].includes(membership.role)) {
      return jsonResponse({ error: 'Not authorized to bid on behalf of this company' }, 403)
    }

    // Everything from here on is a trusted, service-role write — bid_payments
    // and company_billing_profiles' Stripe columns have no client grant.
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: placement } = await admin
      .from('placements')
      .select('id, is_active, name')
      .eq('id', placementId)
      .maybeSingle()
    if (!placement || !placement.is_active) {
      return jsonResponse({ error: 'Placement is not open for bidding' }, 400)
    }

    const { data: currentBid } = await admin
      .from('bids')
      .select('amount')
      .eq('company_id', companyId)
      .eq('placement_id', placementId)
      .eq('status', 'active')
      .maybeSingle()

    const currentAmount = currentBid?.amount ?? 0
    if (targetAmount <= currentAmount) {
      return jsonResponse(
        { error: 'This amount does not raise your current bid — lowering a bid is free and does not need payment' },
        400,
      )
    }

    // The only amount that ever gets charged: the delta above what this
    // company is already paying to hold this placement. Never the full
    // target — that's the point of this whole phase.
    const chargeAmount = Math.round((targetAmount - currentAmount) * 100) / 100

    // At most one pending payment per (company, placement) at a time — a
    // fresh attempt supersedes any stale one instead of leaving two live
    // Checkout sessions that could both eventually complete.
    const { data: stalePending } = await admin
      .from('bid_payments')
      .select('id, stripe_checkout_session_id')
      .eq('company_id', companyId)
      .eq('placement_id', placementId)
      .eq('status', 'pending')

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })

    if (stalePending && stalePending.length > 0) {
      await admin
        .from('bid_payments')
        .update({ status: 'cancelled' })
        .in(
          'id',
          stalePending.map((p) => p.id),
        )
      // Best-effort — an already-expired or already-completed session
      // rejects this call, which is fine, the DB row is already updated
      // and activate_bid_payment() re-checks status independently anyway.
      await Promise.allSettled(
        stalePending
          .filter((p) => p.stripe_checkout_session_id)
          .map((p) => stripe.checkout.sessions.expire(p.stripe_checkout_session_id!)),
      )
    }

    const { data: billingProfile } = await admin
      .from('company_billing_profiles')
      .select('id, billing_provider_customer_id')
      .eq('company_id', companyId)
      .maybeSingle()

    let stripeCustomerId = billingProfile?.billing_provider_customer_id ?? null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ metadata: { company_id: companyId } })
      stripeCustomerId = customer.id
      await admin.from('company_billing_profiles').update({ billing_provider_customer_id: stripeCustomerId }).eq(
        'company_id',
        companyId,
      )
    }

    const { data: paymentRow, error: insertError } = await admin
      .from('bid_payments')
      .insert({
        company_id: companyId,
        placement_id: placementId,
        amount: chargeAmount,
        target_bid_amount: targetAmount,
        currency: 'EUR',
        status: 'pending',
      })
      .select()
      .single()
    if (insertError || !paymentRow) {
      return jsonResponse({ error: 'Could not start payment' }, 500)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(chargeAmount * 100),
            product_data: {
              name: `Sponsored bid — ${placement.name}`,
              description: `One-time payment of €${chargeAmount.toFixed(2)} to raise your bid from €${currentAmount.toFixed(2)} to €${targetAmount.toFixed(2)} on ${placement.name}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { bid_payment_id: paymentRow.id, company_id: companyId, placement_id: placementId },
      success_url: `${siteUrl}/dashboard?bidPayment=success`,
      cancel_url: `${siteUrl}/dashboard?bidPayment=cancelled`,
    })

    await admin
      .from('bid_payments')
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      })
      .eq('id', paymentRow.id)

    return jsonResponse({ checkoutUrl: session.url })
  } catch (err) {
    console.error('create-bid-payment error', err)
    return jsonResponse({ error: 'Unexpected error starting payment' }, 500)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
