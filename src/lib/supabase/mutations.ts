import { supabase } from './client'
import { toReview, type Review } from './queries'
import { extractEdgeFunctionErrorMessage } from '../edgeFunctionError'

/**
 * Toggle the current user's upvote on a company: adds it if absent, removes
 * it if present. Relies on company_votes' UNIQUE(company_id, user_id) and
 * its RLS policies (a user may only touch their own vote row) — this
 * function does not, and does not need to, do its own duplicate/ownership
 * checking client-side.
 */
export async function toggleCompanyVote(companyId: string, userId: string) {
  const { data: existing, error: selectError } = await supabase
    .from('company_votes')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing) {
    const { error } = await supabase.from('company_votes').delete().eq('id', existing.id)
    if (error) throw error
    return { voted: false }
  }

  const { error } = await supabase.from('company_votes').insert({ company_id: companyId, user_id: userId })
  if (error) throw error
  return { voted: true }
}

/**
 * Cast (or change) a user's vote in a battle. battle_votes' UNIQUE(battle_id,
 * user_id) constraint is what actually makes this mutually exclusive at the
 * database level — voting for the other side is an UPDATE of `side`, not a
 * second row; voting the same side again removes the vote entirely,
 * matching the existing client-side voteBattle() toggle UX in
 * src/store/useSession.ts.
 */
export async function castBattleVote(battleId: string, userId: string, side: 'a' | 'b') {
  const { data: existing, error: selectError } = await supabase
    .from('battle_votes')
    .select('id, side')
    .eq('battle_id', battleId)
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing?.side === side) {
    const { error } = await supabase.from('battle_votes').delete().eq('id', existing.id)
    if (error) throw error
    return { side: null }
  }

  if (existing) {
    const { error } = await supabase.from('battle_votes').update({ side }).eq('id', existing.id)
    if (error) throw error
    return { side }
  }

  const { error } = await supabase.from('battle_votes').insert({ battle_id: battleId, user_id: userId, side })
  if (error) throw error
  return { side }
}

/**
 * The one sanctioned way to set a company's bid — calls the place_bid RPC
 * (see supabase/migrations/*_rpc_functions.sql) rather than upserting the
 * bids table directly, so authorization and the bid-history/outbid triggers
 * all happen server-side in one transaction. Not wired into the live
 * dashboard yet — see the Phase 3 report for why.
 */
export async function placeBid(companyId: string, placementId: string, amount: number) {
  const { data, error } = await supabase.rpc('place_bid', {
    p_company_id: companyId,
    p_placement_id: placementId,
    p_amount: amount,
  })
  if (error) throw error
  return data
}

/**
 * Starts a one-time Stripe payment for a new or raised bid — the only path
 * that can result in a bid actually being placed at that amount. Sends
 * only the TARGET bid amount, never a charge amount — the Edge Function
 * is the sole place that computes what Stripe actually charges (the delta
 * above the company's current active bid), so there is nothing here for
 * the browser to manipulate. Returns a Checkout URL to redirect the
 * browser to; nothing in the app is allowed to treat this call itself as
 * "the bid is now active" — that only becomes true once Stripe confirms
 * payment and the webhook activates it (see supabase/functions/stripe-webhook
 * and activate_bid_payment()).
 */
export async function createBidPayment(companyId: string, placementId: string, targetAmount: number) {
  const { data, error } = await supabase.functions.invoke<{ checkoutUrl: string; error?: string }>(
    'create-bid-payment',
    { body: { companyId, placementId, targetAmount } },
  )
  if (error) throw error
  if (!data?.checkoutUrl) throw new Error(data?.error ?? 'Could not start payment')
  return data.checkoutUrl
}

export async function createCompany(input: {
  slug: string
  name: string
  initials: string
  logoColor: string
  tagline: string
  description: string
  website: string
  foundedYear: number
}) {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      slug: input.slug,
      name: input.name,
      initials: input.initials,
      logo_color: input.logoColor,
      tagline: input.tagline,
      description: input.description,
      website: input.website,
      founded_year: input.foundedYear,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Replaces a company's category assignments via the set_company_categories
 * RPC (see 20260822110000_category_min_max_deferred.sql) rather than a raw
 * delete-then-insert: both the add and the remove now land in the same
 * transaction, so the database's deferred min-1/max-2 constraint triggers
 * only ever see the final result — never the momentarily-empty state a
 * two-request delete-then-insert would otherwise pass through. Both bounds
 * are enforced server-side this way, holding even if this client-side
 * check (validateCategorySelection) is bypassed.
 */
export async function setCompanyCategories(companyId: string, categoryIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('set_company_categories', {
    p_company_id: companyId,
    p_category_ids: categoryIds,
  })
  if (error) throw error
}

export const LOGO_MAX_BYTES = 2 * 1024 * 1024 // 2MB
export const LOGO_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/**
 * Uploads to a fresh random path every time (never overwrites in place),
 * points companies.logo_path at it, then best-effort deletes whatever the
 * company's previous logo path was. Membership/authorization is enforced
 * entirely by the storage RLS policies (is_company_member, same helper
 * every other write policy uses) and the companies UPDATE policy — nothing
 * re-checked here.
 */
export async function uploadCompanyLogo(companyId: string, file: File, previousPath?: string | null): Promise<string> {
  if (!LOGO_ALLOWED_TYPES.includes(file.type as (typeof LOGO_ALLOWED_TYPES)[number])) {
    throw new Error('Logo must be a PNG, JPEG, or WebP image.')
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new Error('Logo must be smaller than 2MB.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${companyId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('company-logos')
    .upload(path, file, { contentType: file.type })
  if (uploadError) throw uploadError

  const { error: updateError } = await supabase.from('companies').update({ logo_path: path }).eq('id', companyId)
  if (updateError) {
    // Roll back the upload rather than leave an orphaned, unreferenced file.
    await supabase.storage.from('company-logos').remove([path]).catch(() => {})
    throw updateError
  }

  if (previousPath) {
    await supabase.storage.from('company-logos').remove([previousPath]).catch(() => {})
  }

  return path
}

// ---------------------------------------------------------------------------
// Reviews. Length limits live in src/lib/reviewValidation.ts (shared with
// the form's own validation), and mirror the CHECK constraints in
// supabase/migrations/*_reviews.sql — the DB constraints are the real
// enforcement either way.
// ---------------------------------------------------------------------------

/**
 * user_id is passed in (the caller's own auth.uid(), from useAuth) rather
 * than assumed server-side, but that alone would be spoofable from the
 * client — what actually makes this safe is the reviews table's own RLS
 * INSERT policy, `with check (user_id = auth.uid())`, which independently
 * rejects the row if this doesn't match the caller's real authenticated
 * identity, regardless of what's sent here. author_display_name is
 * deliberately not sent at all — reviews_set_author_name always derives it
 * server-side.
 */
export async function createReview(input: {
  companyId: string
  userId: string
  rating: number
  title: string
  body: string
}): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      company_id: input.companyId,
      user_id: input.userId,
      rating: input.rating,
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .select()
    .single()
  if (error) throw error
  return toReview(data)
}

export async function updateReview(
  reviewId: string,
  input: { rating: number; title: string; body: string },
): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update({ rating: input.rating, title: input.title.trim(), body: input.body.trim() })
    .eq('id', reviewId)
    .select()
    .single()
  if (error) throw error
  return toReview(data)
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Saved companies. Two explicit functions (not a single toggle like
// toggleCompanyVote) because the caller — useSaveState — already knows the
// current saved state from the cached id list, so there's nothing to check
// server-side before writing.
// ---------------------------------------------------------------------------

/**
 * 23505 (unique violation) is swallowed rather than thrown: a stale cache
 * (e.g. two tabs, or a race with an in-flight optimistic update) could send
 * a save for a company that's already saved — that's not a real error, the
 * end state the caller wanted is already true. Authorization itself is
 * enforced by the saved_companies RLS insert policy, not here.
 */
export async function saveCompany(userId: string, companyId: string): Promise<void> {
  const { error } = await supabase.from('saved_companies').insert({ user_id: userId, company_id: companyId })
  if (error && error.code !== '23505') throw error
}

export async function unsaveCompany(userId: string, companyId: string): Promise<void> {
  const { error } = await supabase.from('saved_companies').delete().eq('user_id', userId).eq('company_id', companyId)
  if (error) throw error
}

/**
 * Watching a deal (still backed by the deal_claims table — see
 * *_deal_claims.sql / *_deal_management_and_unwatch.sql) is a toggle, like
 * a save, not a permanent record. 23505 is swallowed for the same reason as
 * saveCompany: a stale cache race sending a duplicate watch isn't a real
 * error, the end state the caller wanted (this deal is watched) is already
 * true. Whether the deal is still open and whether the caller manages the
 * company are both enforced by the deal_claims RLS insert policy, not
 * re-checked here.
 */
export async function watchDeal(userId: string, dealId: string): Promise<void> {
  const { error } = await supabase.from('deal_claims').insert({ user_id: userId, deal_id: dealId })
  if (error && error.code !== '23505') throw error
}

export async function unwatchDeal(userId: string, dealId: string): Promise<void> {
  const { error } = await supabase.from('deal_claims').delete().eq('user_id', userId).eq('deal_id', dealId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Advertiser deal management. Authorization is enforced entirely by the
// deals INSERT/UPDATE/DELETE RLS policies (is_company_member(company_id)),
// not re-checked here — same division of responsibility as every other
// company-owned mutation (bids, logos, etc.). There is no "disable" flag:
// setting expires_at to a past date is how an advertiser takes a deal down
// without deleting it, reusing the exact expiry logic DealCard already
// depends on everywhere else rather than adding a second, redundant
// is_active concept.
// ---------------------------------------------------------------------------

interface DealInput {
  title: string
  discountLabel: string
  description: string
  expiresAt: string
  /** Bare domain/path, no protocol — same convention as companies.website. Empty/omitted falls back to the company's own website. */
  destinationUrl?: string | null
}

export async function createDeal(companyId: string, input: DealInput): Promise<void> {
  const { error } = await supabase.from('deals').insert({
    company_id: companyId,
    title: input.title,
    discount_label: input.discountLabel,
    description: input.description,
    expires_at: input.expiresAt,
    destination_url: input.destinationUrl || null,
  })
  if (error) throw error
}

export async function updateDeal(dealId: string, input: DealInput): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .update({
      title: input.title,
      discount_label: input.discountLabel,
      description: input.description,
      expires_at: input.expiresAt,
      destination_url: input.destinationUrl || null,
    })
    .eq('id', dealId)
  if (error) throw error
}

export async function deleteDeal(dealId: string): Promise<void> {
  const { error } = await supabase.from('deals').delete().eq('id', dealId)
  if (error) throw error
}

/**
 * Only ever updates the caller's own row in practice — enforced by the
 * profiles "self-updatable" RLS policy (id = auth.uid()), not by this
 * .eq() filter, same division of responsibility as every other mutation
 * here.
 */
export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', userId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Public customer profiles (Phase 29). username is deliberately never
// written here — it's auto-generated server-side (generate_unique_username,
// 20260822070000_public_profiles.sql) and not an editable field this phase.
// ---------------------------------------------------------------------------

export async function updateProfile(
  userId: string,
  input: Partial<{ displayName: string; bio: string | null; isPublic: boolean }>,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.isPublic !== undefined ? { is_public: input.isPublic } : {}),
    })
    .eq('id', userId)
  if (error) throw error
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2MB
export const AVATAR_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/**
 * Same shape as uploadCompanyLogo (fresh random path every time, update
 * the row, best-effort delete the old object) — deliberately a separate
 * function against a separate bucket, not shared code, so avatars and
 * company logos never accidentally cross-reference each other's storage.
 */
export async function uploadAvatar(userId: string, file: File, previousPath?: string | null): Promise<string> {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    throw new Error('Avatar must be a PNG, JPEG, or WebP image.')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Avatar must be smaller than 2MB.')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${userId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('user-avatars')
    .upload(path, file, { contentType: file.type })
  if (uploadError) throw uploadError

  const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
  if (updateError) {
    await supabase.storage.from('user-avatars').remove([path]).catch(() => {})
    throw updateError
  }

  if (previousPath) {
    await supabase.storage.from('user-avatars').remove([previousPath]).catch(() => {})
  }

  return path
}

/**
 * Replaces the full interest set (delete-then-insert), same reasoning as
 * setCompanyCategory: simpler than diffing, and the whole set is always
 * small (bounded by the number of categories that exist at all).
 */
export async function setUserInterests(userId: string, categoryIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase.from('user_interests').delete().eq('user_id', userId)
  if (deleteError) throw deleteError
  if (categoryIds.length === 0) return
  const { error: insertError } = await supabase
    .from('user_interests')
    .insert(categoryIds.map((categoryId) => ({ user_id: userId, category_id: categoryId })))
  if (insertError) throw insertError
}

/**
 * Permanently deletes the signed-in user's own account via the
 * delete-account Edge Function — the only path that can, since deleting
 * an auth.users row needs the service-role Admin API, never reachable
 * from the client directly. The function itself refuses (409) if the
 * caller manages a company; that check is server-side and authoritative,
 * this is only a courtesy pre-check so the UI never even offers the
 * button in that case (see DeleteAccountDialog).
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
  if (!error) return
  throw new Error(await extractEdgeFunctionErrorMessage(error, 'Could not delete account'))
}

export type ReportTargetType = 'review' | 'company' | 'deal'
export type ReportReason = 'spam' | 'fake_or_misleading' | 'harassment' | 'illegal_content' | 'impersonation' | 'other'

/**
 * Submits a report via the create_report RPC — the only write path onto
 * public.reports (see 20260822120000_reports.sql). All validation
 * (target existence, valid type/reason, duplicate-pending rejection)
 * happens server-side; this just forwards the call and lets its error
 * surface as-is, since the RPC's messages are already written for a user
 * to read directly ("You already have a pending report for this").
 */
export async function createReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  description: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('create_report', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_description: description,
  })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Company claims. Only the 'manual' method is exposed here — 'business_email'
// exists in the schema/enum for a future phase, but this app has no
// transactional email provider wired up, so offering it now would mean
// faking an "email verified" state with nothing behind it. See the Phase 39
// report for why that path was deliberately left unbuilt rather than
// simulated.
// ---------------------------------------------------------------------------

/**
 * Submits a claim via the create_company_claim RPC — the only write path
 * onto public.company_claims. All authorization (one-company-per-user,
 * "company already has a representative", duplicate-pending rejection)
 * happens server-side inside the RPC; this just forwards the call and lets
 * its error surface as-is, same division of responsibility as createReport.
 * The claim itself never verifies the company — see approve_company_claim,
 * which is service_role-only and invoked by the operator directly, never
 * from this client.
 */
export async function createCompanyClaim(input: {
  companyId: string
  reason: string
  contactEmail: string | null
  evidence: string | null
}): Promise<void> {
  const { error } = await supabase.rpc('create_company_claim', {
    p_company_id: input.companyId,
    p_method: 'manual',
    p_reason: input.reason,
    p_contact_email: input.contactEmail,
    p_evidence: input.evidence,
  })
  if (error) throw error
}
