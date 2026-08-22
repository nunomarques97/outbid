import { supabase } from './client'
import type { Database, NotificationType } from './database.types'
import type { Category, Company, Placement, Bid, Battle, BattleCriterion, Deal, Trend } from '@/mocks/types'

/**
 * Read-side data-access layer. Every function here returns the SAME shared
 * domain types the app has always used (src/mocks/types.ts) — that file
 * isn't mock data, it's the app's domain contract; only the source feeding
 * it changes here. This keeps every existing component's props untouched.
 */

type CompanyRow = Database['public']['Tables']['companies']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type PlacementRow = Database['public']['Tables']['placements']['Row']
type BidRow = Database['public']['Tables']['bids']['Row']
type BattleRow = Database['public']['Tables']['battles']['Row']
type DealRow = Database['public']['Tables']['deals']['Row']
type TrendRow = Database['public']['Tables']['trends']['Row']
type NotificationRow = Database['public']['Tables']['notifications']['Row']
type ReviewRow = Database['public']['Tables']['reviews']['Row']
type CompanyRatingSummaryRow = Database['public']['Views']['company_rating_summary']['Row']
type BidPaymentRow = Database['public']['Tables']['bid_payments']['Row']

// ---------------------------------------------------------------------------
// Row -> domain type adapters
// ---------------------------------------------------------------------------

function toCategory(row: CategoryRow): Category {
  return { id: row.id, slug: row.slug, name: row.name, icon: row.icon, description: row.description }
}

function toCompany(row: CompanyRow, categoryIds: string[], voteCount: number): Company {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    initials: row.initials,
    logoColor: row.logo_color,
    tagline: row.tagline,
    description: row.description,
    categoryIds,
    website: row.website,
    foundedYear: row.founded_year,
    organicVotes: row.organic_votes_baseline + voteCount,
    // The DB column is nullable-in-practice (see database.types.ts) — the
    // shared Company domain type promises a real array to every consumer,
    // so this is the one place that gap gets closed, not scattered `?.`
    // across every component that reads a company's tags.
    tags: row.tags ?? [],
    logoUrl: getCompanyLogoUrl(row.logo_path),
    logoPath: row.logo_path,
  }
}

/** company-logos is a public bucket — getPublicUrl is a pure client-side URL construction, no request involved. */
export function getCompanyLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null
  return supabase.storage.from('company-logos').getPublicUrl(logoPath).data.publicUrl
}

function toPlacement(row: PlacementRow): Placement {
  return {
    id: row.id,
    type: row.type,
    categoryId: row.category_id ?? undefined,
    maxSponsoredSlots: row.max_sponsored_slots,
  }
}

/**
 * getAllActiveBids (below) only ever fetches status='active' rows, so
 * status here is always 'active' — a bid never reaches the client in any
 * other state. There is no customer-facing withdrawal or lowering (see
 * place_bid()'s rejection of both); a historical 'withdrawn' row in the
 * database is simply excluded by that query filter, not mapped to
 * anything here.
 */
function toBid(row: BidRow): Bid {
  return {
    id: row.id,
    companyId: row.company_id,
    placementId: row.placement_id,
    amount: Number(row.amount),
    status: 'active',
    updatedAt: row.updated_at,
  }
}

function toBattle(row: BattleRow, votesA: number, votesB: number): Battle {
  return {
    id: row.id,
    type: 'battle',
    companyAId: row.company_a_id,
    companyBId: row.company_b_id,
    votesA,
    votesB,
    criteria: (row.criteria as unknown as BattleCriterion[] | null) ?? [],
  }
}

/** claimCount = the seed baseline + real watches — same "baseline + count(real rows)" shape as toCompany's organicVotes. */
function toDeal(row: DealRow, realClaimCount: number): Deal {
  return {
    id: row.id,
    type: 'deal',
    companyId: row.company_id,
    title: row.title,
    discountLabel: row.discount_label,
    expiresAt: row.expires_at,
    description: row.description,
    destinationUrl: row.destination_url,
    claimCount: row.claim_count_baseline + realClaimCount,
  }
}

function toTrend(row: TrendRow, relatedCompanyIds: string[]): Trend {
  return {
    id: row.id,
    type: 'trend',
    title: row.title,
    summary: row.summary,
    relatedCompanyIds,
    trendScore: row.trend_score,
    publishedAt: row.published_at,
  }
}

async function getCompanyVoteCounts(companyIds: string[]): Promise<Map<string, number>> {
  if (companyIds.length === 0) return new Map()
  const { data, error } = await supabase.from('company_votes').select('company_id').in('company_id', companyIds)
  if (error) throw error
  const counts = new Map<string, number>()
  for (const row of data) counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1)
  return counts
}

// ---------------------------------------------------------------------------
// Categories (small, global — 4 rows, needed by nearly every page)
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) throw error
  return data.map(toCategory)
}

// ---------------------------------------------------------------------------
// Companies — precise fetches for the two "one company" / "one category"
// cases, plus a global list only where a page genuinely needs to see across
// all companies (search, homepage rankings preview).
// ---------------------------------------------------------------------------

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const { data: row, error } = await supabase.from('companies').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  if (!row) return null

  const [{ data: links, error: linksError }, votes] = await Promise.all([
    supabase.from('company_categories').select('category_id').eq('company_id', row.id),
    getCompanyVoteCounts([row.id]),
  ])
  if (linksError) throw linksError

  return toCompany(row, links.map((l) => l.category_id), votes.get(row.id) ?? 0)
}

/** Shared by every "companies matching some id list" query below, so the join+vote-count assembly lives in one place. */
async function getCompaniesByIds(ids: string[]): Promise<Company[]> {
  if (ids.length === 0) return []

  const [{ data: companies, error: companiesError }, { data: allLinks, error: allLinksError }, votes] = await Promise.all([
    supabase.from('companies').select('*').in('id', ids),
    supabase.from('company_categories').select('company_id, category_id').in('company_id', ids),
    getCompanyVoteCounts(ids),
  ])
  if (companiesError) throw companiesError
  if (allLinksError) throw allLinksError

  const categoryIdsByCompany = new Map<string, string[]>()
  for (const l of allLinks) {
    const list = categoryIdsByCompany.get(l.company_id) ?? []
    list.push(l.category_id)
    categoryIdsByCompany.set(l.company_id, list)
  }

  return companies.map((row) => toCompany(row, categoryIdsByCompany.get(row.id) ?? [], votes.get(row.id) ?? 0))
}

export async function getCompaniesByCategory(categoryId: string): Promise<Company[]> {
  const { data: membership, error: membershipError } = await supabase
    .from('company_categories')
    .select('company_id')
    .eq('category_id', categoryId)
  if (membershipError) throw membershipError
  return getCompaniesByIds(membership.map((m) => m.company_id))
}

/** Companies the given user is a member of (any role), via company_members — respects that table's RLS as-is. */
export async function getMyCompanies(userId: string): Promise<Company[]> {
  const { data: memberships, error } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
  if (error) throw error
  return getCompaniesByIds(memberships.map((m) => m.company_id))
}

/** Every company, for pages that genuinely need to see across all of them (search, homepage summaries). */
export async function getAllCompanies(): Promise<Company[]> {
  const [{ data: companies, error: companiesError }, { data: links, error: linksError }] = await Promise.all([
    supabase.from('companies').select('*'),
    supabase.from('company_categories').select('company_id, category_id'),
  ])
  if (companiesError) throw companiesError
  if (linksError) throw linksError

  const votes = await getCompanyVoteCounts(companies.map((c) => c.id))

  const categoryIdsByCompany = new Map<string, string[]>()
  for (const l of links) {
    const list = categoryIdsByCompany.get(l.company_id) ?? []
    list.push(l.category_id)
    categoryIdsByCompany.set(l.company_id, list)
  }

  return companies.map((row) => toCompany(row, categoryIdsByCompany.get(row.id) ?? [], votes.get(row.id) ?? 0))
}

// ---------------------------------------------------------------------------
// Placements (6 rows total — always fetched in full) + active bids
// ---------------------------------------------------------------------------

export async function getPlacements(): Promise<Placement[]> {
  const { data, error } = await supabase.from('placements').select('*')
  if (error) throw error
  return data.map(toPlacement)
}

export function getPlacementForCategory(placements: Placement[], categoryId: string): Placement | null {
  return placements.find((p) => p.type === 'category_leaderboard' && p.categoryId === categoryId) ?? null
}

/**
 * Human label for a placement (e.g. "Web Hosting Leaderboard"). Extracted
 * here (was previously duplicated inline in DashboardPage) so the
 * notification list can show the same label without reimplementing it.
 */
export function getPlacementDisplayName(placement: Placement, categories: Category[]): string {
  if (placement.type === 'category_leaderboard') {
    const category = categories.find((c) => c.id === placement.categoryId)
    return `${category?.name ?? 'Category'} Leaderboard`
  }
  if (placement.type === 'homepage_featured') return 'Homepage Featured'
  if (placement.type === 'deal_spotlight') return 'Deal Spotlight'
  return 'Placement'
}

/**
 * Every active bid, across every placement. Deliberately global rather than
 * one request per placement: the whole table is on the order of a few dozen
 * rows, every ranking-consuming component (leaderboards, homepage preview,
 * company sponsorship status) needs a different slice of it, and fetching
 * once and sharing via the query cache is fewer total requests than fetching
 * per-placement everywhere it's used.
 */
export async function getAllActiveBids(): Promise<Bid[]> {
  const { data, error } = await supabase.from('bids').select('*').eq('status', 'active')
  if (error) throw error
  return data.map(toBid)
}

// ---------------------------------------------------------------------------
// Battles
// ---------------------------------------------------------------------------

async function getBattleVoteCounts(battleIds: string[]): Promise<Map<string, { votesA: number; votesB: number }>> {
  if (battleIds.length === 0) return new Map()
  const { data, error } = await supabase.from('battle_votes').select('battle_id, side').in('battle_id', battleIds)
  if (error) throw error
  const counts = new Map<string, { votesA: number; votesB: number }>()
  for (const row of data) {
    const c = counts.get(row.battle_id) ?? { votesA: 0, votesB: 0 }
    if (row.side === 'a') c.votesA++
    else c.votesB++
    counts.set(row.battle_id, c)
  }
  return counts
}

export async function getBattles(): Promise<Battle[]> {
  const { data: rows, error } = await supabase.from('battles').select('*').order('created_at')
  if (error) throw error
  const counts = await getBattleVoteCounts(rows.map((r) => r.id))
  return rows.map((row) => {
    const c = counts.get(row.id) ?? { votesA: 0, votesB: 0 }
    return toBattle(row, c.votesA, c.votesB)
  })
}

export async function getBattleById(id: string): Promise<Battle | null> {
  const { data: row, error } = await supabase.from('battles').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!row) return null
  const counts = await getBattleVoteCounts([row.id])
  const c = counts.get(row.id) ?? { votesA: 0, votesB: 0 }
  return toBattle(row, c.votesA, c.votesB)
}

// ---------------------------------------------------------------------------
// Deals (8 rows total)
// ---------------------------------------------------------------------------

/** Reads deal_claim_counts (see *_deal_claims.sql) — a public aggregate view, never the private deal_claims rows themselves. */
async function getDealClaimCounts(dealIds: string[]): Promise<Map<string, number>> {
  if (dealIds.length === 0) return new Map()
  const { data, error } = await supabase.from('deal_claim_counts').select('*').in('deal_id', dealIds)
  if (error) throw error
  return new Map(data.map((row) => [row.deal_id, row.claim_count]))
}

/**
 * Sorting purely by expires_at ascending (the previous behavior) means an
 * expired deal — whose date is now in the past — sorts as if it were the
 * SOONEST-expiring, i.e. first. That silently pushes expired offers to the
 * very top of /deals and into the homepage's "Live deals" teaser (which
 * only takes the first 3) as time passes, which is exactly the kind of
 * thing that erodes trust. Active deals (soonest-expiring first) always
 * sort ahead of every expired one; expired deals are still included
 * (DealCard shows them as "Expired" rather than hiding them, since a
 * customer who claimed one should still be able to find it on /saved)
 * but pushed to the end, oldest-expired last.
 */
function sortDealsForDisplay(deals: Deal[]): Deal[] {
  const now = Date.now()
  return [...deals].sort((a, b) => {
    const aExpired = new Date(a.expiresAt).getTime() <= now
    const bExpired = new Date(b.expiresAt).getTime() <= now
    if (aExpired !== bExpired) return aExpired ? 1 : -1
    return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
  })
}

export async function getDeals(): Promise<Deal[]> {
  const { data, error } = await supabase.from('deals').select('*').order('expires_at')
  if (error) throw error
  const counts = await getDealClaimCounts(data.map((d) => d.id))
  return sortDealsForDisplay(data.map((row) => toDeal(row, counts.get(row.id) ?? 0)))
}

// ---------------------------------------------------------------------------
// Trends (6 rows total)
// ---------------------------------------------------------------------------

export async function getTrends(): Promise<Trend[]> {
  const [{ data: rows, error }, { data: links, error: linksError }] = await Promise.all([
    supabase.from('trends').select('*').order('trend_score', { ascending: false }),
    supabase.from('trend_companies').select('trend_id, company_id'),
  ])
  if (error) throw error
  if (linksError) throw linksError

  const companyIdsByTrend = new Map<string, string[]>()
  for (const l of links) {
    const list = companyIdsByTrend.get(l.trend_id) ?? []
    list.push(l.company_id)
    companyIdsByTrend.set(l.trend_id, list)
  }

  return rows.map((row) => toTrend(row, companyIdsByTrend.get(row.id) ?? []))
}

// ---------------------------------------------------------------------------
// Company votes (used by the useCompanyVote hook)
// ---------------------------------------------------------------------------

/**
 * Everything VoteButton needs for one company in one round trip's worth of
 * queries: the real company_id (resolved from the slug that's shared
 * between the mock dataset and the seeded DB), the live total vote count
 * (baseline + real votes), and whether the given user has already voted.
 */
export async function getCompanyVoteState(companySlug: string, userId: string) {
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, organic_votes_baseline')
    .eq('slug', companySlug)
    .single()
  if (companyError) throw companyError

  const [{ count, error: countError }, { data: mine, error: mineError }] = await Promise.all([
    supabase.from('company_votes').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
    supabase.from('company_votes').select('id').eq('company_id', company.id).eq('user_id', userId).maybeSingle(),
  ])
  if (countError) throw countError
  if (mineError) throw mineError

  return {
    companyId: company.id,
    total: company.organic_votes_baseline + (count ?? 0),
    voted: Boolean(mine),
  }
}

/** Everything a battle vote button needs: current vote for this user, if any. */
export async function getMyBattleVote(battleId: string, userId: string): Promise<'a' | 'b' | null> {
  const { data, error } = await supabase
    .from('battle_votes')
    .select('side')
    .eq('battle_id', battleId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.side ?? null
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: string
  companyId: string
  type: NotificationType
  placementId: string | null
  /**
   * Whatever handle_bid_leader_change() put in the jsonb payload (see
   * supabase/migrations/*_bids_and_history.sql) — currently always
   * leader_company_id/leader_amount/previous_amount for 'outbid' rows.
   * jsonb has no compile-time shape, so this is read defensively rather
   * than trusted, same reasoning as the tags column fix.
   */
  payload: { leaderCompanyId?: string; leaderAmount?: number; previousAmount?: number }
  readAt: string | null
  createdAt: string
}

function toNotification(row: NotificationRow): Notification {
  const raw = (row.payload ?? {}) as Record<string, unknown>
  return {
    id: row.id,
    companyId: row.company_id,
    type: row.type,
    placementId: row.placement_id,
    payload: {
      leaderCompanyId: typeof raw.leader_company_id === 'string' ? raw.leader_company_id : undefined,
      leaderAmount: typeof raw.leader_amount === 'number' ? raw.leader_amount : undefined,
      previousAmount: typeof raw.previous_amount === 'number' ? raw.previous_amount : undefined,
    },
    readAt: row.read_at,
    createdAt: row.created_at,
  }
}

/**
 * Takes every company the signed-in user belongs to, not just one — a user
 * with multiple companies must see outbid notifications for all of them in
 * one bell, not just whichever company happened to load first.
 */
export async function getNotificationsForCompanies(companyIds: string[]): Promise<Notification[]> {
  if (companyIds.length === 0) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .in('company_id', companyIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toNotification)
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

/** One request instead of N — the existing "members can mark their notifications read" RLS policy already permits this update row-by-row. */
export async function markAllNotificationsRead(companyIds: string[]) {
  if (companyIds.length === 0) return
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('company_id', companyIds)
    .is('read_at', null)
  if (error) throw error
}

/**
 * Billing domain foundation only — no payment data exists yet. Every
 * company gets exactly one profile automatically (see
 * *_billing_foundations.sql), so this should never return null for a real
 * company_id.
 */
// ---------------------------------------------------------------------------
// Saved companies — IDs only, deliberately. The caller combines these with
// the already-cached company list (useAllCompanies) rather than this
// function returning full Company objects itself, so saving/loading /saved
// never triggers a second per-company (or even a second bulk) fetch.
// ---------------------------------------------------------------------------

/** Most-recently-saved first — matches saved_companies_user_idx (user_id, created_at desc). */
export async function getSavedCompanyIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_companies')
    .select('company_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((row) => row.company_id)
}

// ---------------------------------------------------------------------------
// Watched deals — IDs only, same reasoning as getSavedCompanyIds: the caller
// combines these with the already-cached useDeals() list rather than a
// second per-deal fetch. Still backed by the deal_claims table underneath
// (see *_deal_claims.sql / *_deal_management_and_unwatch.sql) — only the
// customer-facing concept is now "watch," not the database.
// ---------------------------------------------------------------------------

/** Most-recently-watched first — matches deal_claims_user_idx (user_id, created_at desc). */
export async function getMyWatchedDealIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('deal_claims')
    .select('deal_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((row) => row.deal_id)
}

export async function getCompanyBillingProfile(companyId: string) {
  const { data, error } = await supabase
    .from('company_billing_profiles')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Reviews — the customer-facing reputation system. No mock counterpart (same
// reasoning as Notification above): this is a purely Supabase-era concept,
// so its domain type lives here rather than in src/mocks/types.ts.
// ---------------------------------------------------------------------------

export interface Review {
  id: string
  companyId: string
  userId: string
  rating: number
  title: string
  body: string
  authorDisplayName: string
  createdAt: string
  updatedAt: string
}

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    authorDisplayName: row.author_display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export interface CompanyRatingSummary {
  companyId: string
  reviewCount: number
  averageRating: number
  /** Keyed by star value (5 down to 1) rather than a fixed-shape object, so rendering the distribution is a simple loop. */
  countsByStar: Record<1 | 2 | 3 | 4 | 5, number>
}

function emptyRatingSummary(companyId: string): CompanyRatingSummary {
  return { companyId, reviewCount: 0, averageRating: 0, countsByStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
}

function toRatingSummary(row: CompanyRatingSummaryRow): CompanyRatingSummary {
  return {
    companyId: row.company_id,
    reviewCount: row.review_count,
    averageRating: row.average_rating,
    countsByStar: {
      5: row.rating_5_count,
      4: row.rating_4_count,
      3: row.rating_3_count,
      2: row.rating_2_count,
      1: row.rating_1_count,
    },
  }
}

/** Newest first — matches the reviews_company_idx (company_id, created_at desc) index. */
export async function getReviewsForCompany(companyId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toReview)
}

/** null when this user hasn't reviewed this company yet — the normal case, not an error. */
export async function getMyReviewForCompany(companyId: string, userId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? toReview(data) : null
}

/**
 * Every review this user has ever written, across every company, newest
 * first — used by /saved's "Your reviews" section, the only place a
 * customer can find their own review activity without knowing which
 * company profile to revisit. reviews is fully public-read, so no RLS gap
 * here; no dedicated user_id index exists (only reviews_company_idx), but
 * the table is small enough at this stage that it doesn't need one — same
 * reasoning already applied throughout this project's smaller tables.
 */
export async function getReviewsByUser(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toReview)
}

/** A company with zero reviews has no row in the view at all — treated as a real, valid "no reviews yet" result, not an error. */
export async function getCompanyRatingSummary(companyId: string): Promise<CompanyRatingSummary> {
  const { data, error } = await supabase
    .from('company_rating_summary')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  return data ? toRatingSummary(data) : emptyRatingSummary(companyId)
}

/**
 * Every company's rating summary in one request, for surfaces that show many
 * companies at once (search results, leaderboard entries) — same "fetch the
 * whole small table, filter client-side" shape as getAllCompanies, so this
 * composes with however that page already narrows its company list down.
 */
export async function getAllCompanyRatingSummaries(): Promise<Map<string, CompanyRatingSummary>> {
  const { data, error } = await supabase.from('company_rating_summary').select('*')
  if (error) throw error
  const map = new Map<string, CompanyRatingSummary>()
  for (const row of data) map.set(row.company_id, toRatingSummary(row))
  return map
}

// ---------------------------------------------------------------------------
// Profile — currently just the public display name. profiles already has
// "self-readable"/"self-updatable" RLS (core_schema.sql), so this needed no
// migration; it was purely a missing frontend surface. Changing this value
// only affects reviews written after the change — reviews.author_display_name
// is snapshotted at creation time (reviews_set_author_name trigger), not a
// live join, so past reviews intentionally keep whatever name was current
// when they were written.
// ---------------------------------------------------------------------------

export async function getMyDisplayName(userId: string): Promise<string> {
  const { data, error } = await supabase.from('profiles').select('display_name').eq('id', userId).single()
  if (error) throw error
  return data.display_name
}

// ---------------------------------------------------------------------------
// Bid payments — read-only history of one-time Stripe payments. No mock
// counterpart (same reasoning as Review/Notification above): this is a
// purely Supabase-era concept. Rows are never written from the frontend —
// see supabase/functions/create-bid-payment and stripe-webhook — this is
// display only.
// ---------------------------------------------------------------------------

export interface BidPayment {
  id: string
  placementId: string
  /** Actual EUR amount charged — the delta above the prior bid, or the full amount for a brand-new bid. */
  amount: number
  /** The bid amount this payment established (or will establish) — not what was charged. */
  targetBidAmount: number
  currency: string
  status: BidPaymentRow['status']
  createdAt: string
}

function toBidPayment(row: BidPaymentRow): BidPayment {
  return {
    id: row.id,
    placementId: row.placement_id,
    amount: row.amount,
    targetBidAmount: row.target_bid_amount,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
  }
}

/** Newest first — matches the bid_payments_company_idx (company_id, created_at desc) index. */
export async function getBidPaymentsForCompany(companyId: string): Promise<BidPayment[]> {
  const { data, error } = await supabase
    .from('bid_payments')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(toBidPayment)
}
