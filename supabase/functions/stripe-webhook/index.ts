// Outbid Phase 27B — Stripe webhook. This is the ONLY place a bid_payments
// row is ever marked succeeded, and (via activate_bid_payment) the ONLY
// place a paid bid actually becomes live. The browser's redirect back from
// Checkout is never trusted for this — it just shows a "confirming" state
// while this function does the real work, often before the redirect even
// finishes loading.
//
// verify_jwt is off for this function (see supabase/config.toml) because
// Stripe calls it directly, with no Supabase session — authenticity comes
// entirely from the Stripe-Signature header, verified below.
//
// Event set is deliberately minimal: checkout.session.completed (payment
// succeeded — activate the bid) and checkout.session.expired (abandoned —
// mark the payment cancelled so it doesn't linger as a stale "pending" row;
// the bid was never touched either way). No other Stripe event type is
// handled.
import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

Deno.serve(async (req) => {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    if (!signature) throw new Error('Missing stripe-signature header')
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('stripe-webhook signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Idempotency: Stripe retries any delivery that doesn't get a 2xx, and
  // can in rare cases deliver the same event twice regardless. Recording
  // the event id first and bailing out on a duplicate makes every handler
  // below safe to run more than once for the same event.
  const { error: dedupeError } = await admin.from('stripe_webhook_events').insert({ id: event.id })
  if (dedupeError) {
    // Unique violation on `id` = already processed this event; anything
    // else is a real error we still want Stripe to retry.
    if (dedupeError.code === '23505') {
      return new Response('Already processed', { status: 200 })
    }
    console.error('stripe-webhook dedupe insert failed', dedupeError)
    return new Response('Internal error', { status: 500 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const paymentId = session.metadata?.bid_payment_id
        if (paymentId) {
          const { error } = await admin.rpc('activate_bid_payment', { p_payment_id: paymentId })
          if (error) console.error('activate_bid_payment failed', paymentId, error)
        }
        break
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const paymentId = session.metadata?.bid_payment_id
        if (paymentId) {
          await admin.from('bid_payments').update({ status: 'cancelled' }).eq('id', paymentId).eq(
            'status',
            'pending',
          )
        }
        break
      }
      default:
        // Not part of this flow — ignored on purpose.
        break
    }
  } catch (err) {
    console.error('stripe-webhook handler error', event.type, err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
