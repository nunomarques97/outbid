// Repcastr Phase 36 — self-service account deletion.
//
// Why this can't be a plain client call: deleting an auth.users row
// requires the Supabase Admin API (service role only) — no client, even
// the account's own owner, can call it directly. This function is the
// only bridge: it re-derives who the caller is from their own JWT (same
// pattern as create-bid-payment), refuses if they manage a company, and
// only then uses the service-role client to delete the account.
//
// Every table with a foreign key to auth.users (profiles, company_members,
// company_votes, battle_votes, reviews, saved_companies, deal_claims,
// user_interests, reports) is declared ON DELETE CASCADE, so this single
// admin.deleteUser call is what actually removes all of it — there is
// nothing else this function needs to clean up by hand. bid_payments has
// no FK to auth.users at all, so payment/billing history is structurally
// untouched by this regardless of whose account is deleted.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    // Scoped to the caller's own JWT — used only to find out who they are.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await callerClient.auth.getUser()
    if (!user) {
      return jsonResponse({ error: 'Not authenticated' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Authoritative product rule: a user who manages a company cannot
    // self-delete — their company would otherwise become ownerless, with
    // its bid/payment history left attached to nothing. Checked here,
    // server-side, not just hidden in the UI.
    const { count, error: membershipError } = await admin
      .from('company_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if (membershipError) {
      return jsonResponse({ error: 'Could not verify company membership' }, 500)
    }
    if (count && count > 0) {
      return jsonResponse(
        { error: 'You manage a company. Account deletion requires a manual request — see the contact email on this page.' },
        409,
      )
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return jsonResponse({ error: 'Could not delete account' }, 500)
    }

    return jsonResponse({ deleted: true })
  } catch (err) {
    console.error('delete-account error', err)
    return jsonResponse({ error: 'Unexpected error deleting account' }, 500)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
