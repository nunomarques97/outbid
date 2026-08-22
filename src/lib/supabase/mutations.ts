import { supabase } from './client'
import { toReview, type Review } from './queries'

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

export async function withdrawBid(companyId: string, placementId: string) {
  const { data, error } = await supabase.rpc('withdraw_bid', {
    p_company_id: companyId,
    p_placement_id: placementId,
  })
  if (error) throw error
  return data
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
 * A claim is a permanent record, not a toggle — there is no unclaimDeal().
 * 23505 is swallowed for the same reason as saveCompany: a stale cache
 * race sending a duplicate claim isn't a real error, the end state the
 * caller wanted (this deal is claimed) is already true. Whether the deal is
 * still open and whether the caller manages the company are both enforced
 * by the deal_claims RLS insert policy, not re-checked here.
 */
export async function claimDeal(userId: string, dealId: string): Promise<void> {
  const { error } = await supabase.from('deal_claims').insert({ user_id: userId, deal_id: dealId })
  if (error && error.code !== '23505') throw error
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
