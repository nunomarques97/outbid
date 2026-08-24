import type { Bid, Category, Company } from '@/mocks/types'

export interface RankedBid extends Bid {
  rank: number
}

/**
 * How many of a category's eligible companies count as "sponsored". Left
 * uncapped rather than an arbitrary display limit like the old 3-per-
 * category-placement model (pre Phase 34): the DB's own global_sponsored
 * placement already has max_sponsored_slots=9999, i.e. "no real cap" is the
 * actual product rule now that every company holds at most one global bid.
 * A company with any active bid eligible in a category is sponsored there,
 * full stop — rank position (1st, 2nd, 3rd, ...) is a separate concern from
 * sponsored status, and callers must never truncate this to fewer than
 * "however many companies actually have an active bid" or a real sponsor
 * silently loses its sponsored badge (see getCategoryRanking).
 */
export const CATEGORY_SPONSORED_SLOTS = Infinity

/**
 * Ordered active bids for a placement, highest amount first. The tie-break
 * (equal amounts ordered by earlier updatedAt first) is explicit rather
 * than left to incidental array order, so two equal bids always resolve
 * the same way regardless of insertion order — mirrors the database's
 * `ORDER BY amount DESC, created_at ASC` in supabase/migrations (the DB
 * uses each bid's original placement time, which never changes after
 * creation; the client uses updatedAt since that's the timestamp available
 * on the shared Bid domain type — same "earlier wins ties" rule,
 * adjacent-but-not-identical source field).
 *
 * As of Phase 34, the only placement this is ever called with for
 * sponsored-visibility purposes is the single global_sponsored placement —
 * a company holds at most one active bid, full stop, enforced by the
 * database's own UNIQUE(company_id, placement_id) plus there being exactly
 * one row of this placement type. Category-scoped bidding no longer
 * exists; categories only filter WHICH companies' global bids are
 * eligible to appear where (see getCategoryRanking / getTopBidders below).
 */
export function getRankedBids(bids: Bid[], placementId: string): RankedBid[] {
  return bids
    .filter((b) => b.placementId === placementId && b.status !== 'paused')
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    })
    .map((b, i) => ({ ...b, rank: i + 1 }))
}

/** True if some other active bid on this placement currently beats the given company's bid. */
export function isCompanyOutbid(bids: Bid[], placementId: string, companyId: string): boolean {
  const ranked = getRankedBids(bids, placementId)
  const mine = ranked.find((b) => b.companyId === companyId)
  if (!mine) return false
  return ranked.some((b) => b.companyId !== companyId && b.amount > mine.amount)
}

export function getCompanyBid(bids: Bid[], placementId: string, companyId: string) {
  return bids.find((b) => b.placementId === placementId && b.companyId === companyId)
}

export interface OrganicRankEntry {
  company: Company
  votes: number
}

export interface CategoryRanking {
  sponsored: RankedBid[]
  organic: OrganicRankEntry[]
}

/**
 * A category's two ranking layers, computed from the SAME single global
 * bid every company holds (see getRankedBids above) — never a
 * category-specific bid, since there's no such thing anymore. "Eligible"
 * means the company lists this category among its (1–2) categories;
 * "sponsored" is the top `maxSponsoredSlots` eligible companies by global
 * bid amount, re-ranked 1..N within this category specifically (not the
 * company's global rank, which may differ); "organic" is every other
 * eligible company, ordered by community votes, completely uninfluenced
 * by bid amount — a company can be #1 organic and #5 sponsored, or the
 * reverse, in the very same category.
 */
export function getCategoryRanking(
  companies: Company[],
  bids: Bid[],
  globalPlacementId: string,
  categoryId: string,
  maxSponsoredSlots: number,
): CategoryRanking {
  const eligible = companies.filter((c) => c.categoryIds.includes(categoryId))
  const eligibleIds = new Set(eligible.map((c) => c.id))

  const sponsored = getRankedBids(bids, globalPlacementId)
    .filter((b) => eligibleIds.has(b.companyId))
    .slice(0, maxSponsoredSlots)
    .map((b, i) => ({ ...b, rank: i + 1 }))
  const sponsoredIds = new Set(sponsored.map((b) => b.companyId))

  const organic = eligible
    .filter((c) => !sponsoredIds.has(c.id))
    .map((c) => ({ company: c, votes: c.organicVotes }))
    .sort((a, b) => b.votes - a.votes)

  return { sponsored, organic }
}

export interface GlobalBidStatus {
  /** Every company's active global bid, ranked highest-first. */
  ranked: RankedBid[]
  myBid: RankedBid | undefined
  outbid: boolean
  leader: RankedBid | undefined
}

/**
 * The advertiser dashboard's entire bidding picture — one company has at
 * most one bid, so this replaces what used to be a per-placement list
 * (getMyPlacements/getAvailablePlacements) with a single status. Pure and
 * stateless — takes companyId as a plain argument rather than reading it
 * from component/session state, so switching companies is guaranteed to
 * recompute from scratch against the same bids array, never leaking a
 * previous company's bid.
 */
export function getGlobalBidStatus(bids: Bid[], globalPlacementId: string, companyId: string): GlobalBidStatus {
  const ranked = getRankedBids(bids, globalPlacementId)
  const myBid = ranked.find((b) => b.companyId === companyId)
  const leader = ranked[0]
  const outbid = Boolean(myBid) && isCompanyOutbid(bids, globalPlacementId, companyId)
  return { ranked, myBid, outbid, leader }
}

export interface TopBidderEntry {
  company: Company
  bid: RankedBid
}

/**
 * Cross-category "Top Bidders" — ONE row per company (a company has only
 * one active bid, so this falls out naturally rather than needing
 * deduping), sorted by that bid's amount, optionally filtered to
 * companies eligible in one category. Never shows the same company twice
 * even if it belongs to two categories — see Phase 34 Part 4: a €1,000
 * bid from a company in both Food & Dining and Shopping is one purchase,
 * shown once in the "All categories" view, and once each time its
 * category filter is applied — always the identical amount, since it's
 * the identical bid.
 */
export function getTopBidders(
  companies: Company[],
  bids: Bid[],
  globalPlacementId: string,
  categoryId?: string,
): TopBidderEntry[] {
  const eligibleIds = new Set(
    (categoryId ? companies.filter((c) => c.categoryIds.includes(categoryId)) : companies).map((c) => c.id),
  )
  const companiesById = new Map(companies.map((c) => [c.id, c]))

  return getRankedBids(bids, globalPlacementId)
    .filter((b) => eligibleIds.has(b.companyId))
    .map((bid, i) => ({ bid: { ...bid, rank: i + 1 }, company: companiesById.get(bid.companyId) }))
    .filter((e): e is TopBidderEntry => Boolean(e.company))
}

export interface HomepageTopBidders {
  primary: TopBidderEntry[]
  more: TopBidderEntry[]
}

/**
 * Splits a full, already-ranked Top Bidders list into the homepage's two
 * tiers — the top `primaryCount` shown prominently, the next `moreCount`
 * for the secondary "More bidders" carousel. The homepage never shows
 * more than primaryCount + moreCount entries; /top-bidders (unsliced
 * getTopBidders) is the real full list (see Phase 34.1).
 */
export function splitTopBiddersForHomepage(
  entries: TopBidderEntry[],
  primaryCount: number,
  moreCount: number,
): HomepageTopBidders {
  return {
    primary: entries.slice(0, primaryCount),
    more: entries.slice(primaryCount, primaryCount + moreCount),
  }
}

export interface CategoryBidTotal {
  category: Category
  total: number
}

/**
 * Every given category's total active sponsored bid amount (sum across
 * every company eligible in that category — a company in two categories
 * contributes its one global bid to both totals; that's not double-
 * charging, it's the same purchase counting toward each place it's
 * eligible to appear, exactly like getTopBidders' category filter).
 * Zero-total categories are included in the output — filtering, if any,
 * is each caller's own choice, not baked in here.
 */
function computeCategoryBidTotals(
  companies: Company[],
  bids: Bid[],
  globalPlacementId: string,
  categories: Category[],
): CategoryBidTotal[] {
  const globalBidByCompany = new Map(getRankedBids(bids, globalPlacementId).map((b) => [b.companyId, b.amount]))

  return categories.map((category) => {
    const total = companies
      .filter((c) => c.categoryIds.includes(category.id))
      .reduce((sum, c) => sum + (globalBidByCompany.get(c.id) ?? 0), 0)
    return { category, total }
  })
}

/**
 * Homepage showcase helper (SponsoredMechanicShowcase) — ranked by bid
 * total, zero-spend categories excluded, capped to topN. This is meant to
 * highlight active commercial interest, not pad itself out with quiet
 * categories — different need from getCategoriesRankedByBidTotal below,
 * which a full-category listing (RankingsPreview) uses instead precisely
 * because it must never lose a category just because nobody's bidding on
 * it yet.
 */
export function getTopCategoriesByBidTotal(
  companies: Company[],
  bids: Bid[],
  globalPlacementId: string,
  categories: Category[],
  topN: number,
): CategoryBidTotal[] {
  return computeCategoryBidTotals(companies, bids, globalPlacementId, categories)
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total || a.category.name.localeCompare(b.category.name))
    .slice(0, topN)
}

/**
 * ALL given categories ranked by sponsored bid total, descending — zero-
 * bid categories are always kept, never filtered out, same alphabetical
 * tie-break as getTopCategoriesByBidTotal. The category list itself is
 * whatever the caller passes in (e.g. every active category); this
 * function only orders it, it never removes an entry — a category with
 * one bid moving to #1 must never make the other 12 disappear.
 */
export function getCategoriesRankedByBidTotal(
  companies: Company[],
  bids: Bid[],
  globalPlacementId: string,
  categories: Category[],
): CategoryBidTotal[] {
  return computeCategoryBidTotals(companies, bids, globalPlacementId, categories).sort(
    (a, b) => b.total - a.total || a.category.name.localeCompare(b.category.name),
  )
}
