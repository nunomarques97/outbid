import type { Bid, Company, Placement } from '@/mocks/types'

export interface RankedBid extends Bid {
  rank: number
}

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

export function getSponsoredSlice(bids: Bid[], placementId: string, maxSlots: number): RankedBid[] {
  return getRankedBids(bids, placementId).slice(0, maxSlots)
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

/**
 * The community-ranked list for a category: every company NOT currently
 * occupying a paid sponsored slot there, ordered by votes. Centralized here
 * so the homepage preview, the category page, and company profiles never
 * compute this ranking three slightly-different ways.
 *
 * Deliberately source-agnostic: takes the already-scoped company list and
 * placement as plain data instead of reaching into a specific data source
 * itself (it used to import mock lookup functions directly, which meant it
 * could only ever rank mock data). `company.organicVotes` is expected to
 * already be the real, current vote total — this function only orders and
 * excludes sponsored companies, it never computes vote counts itself.
 */
export function getOrganicRanking(companies: Company[], bids: Bid[], placement: Placement | null): OrganicRankEntry[] {
  const sponsoredIds = new Set(
    placement ? getSponsoredSlice(bids, placement.id, placement.maxSponsoredSlots).map((b) => b.companyId) : [],
  )

  return companies
    .filter((c) => !sponsoredIds.has(c.id))
    .map((c) => ({ company: c, votes: c.organicVotes }))
    .sort((a, b) => b.votes - a.votes)
}

export interface MyPlacementEntry {
  placement: Placement
  myBid: RankedBid
  ranked: RankedBid[]
  outbid: boolean
  leader: RankedBid
}

/**
 * The advertiser dashboard's "placements this company is bidding on."
 * Pure and stateless — takes companyId as a plain argument rather than
 * reading it from any component/session state, specifically so switching
 * companies can never leak a previous company's placements: calling this
 * again with a different companyId against the exact same bids/placements
 * arrays is guaranteed (not just expected) to recompute from scratch,
 * with no memoized or cached intermediate tied to the old id. Extracted
 * out of DashboardPage so this guarantee is independently testable rather
 * than only inferable from reading the component.
 */
export function getMyPlacements(bids: Bid[], placements: Placement[], companyId: string): MyPlacementEntry[] {
  return placements
    .map((placement) => {
      const ranked = getRankedBids(bids, placement.id)
      const myBid = ranked.find((b) => b.companyId === companyId)
      if (!myBid) return null
      const outbid = isCompanyOutbid(bids, placement.id, companyId)
      const leader = ranked[0]
      return { placement, myBid, ranked, outbid, leader }
    })
    .filter((p): p is MyPlacementEntry => Boolean(p))
}

export interface AvailablePlacementEntry {
  placement: Placement
  ranked: RankedBid[]
  leader: RankedBid | undefined
}

/** Placements this company isn't bidding on at all yet — same purity/isolation guarantee as getMyPlacements. */
export function getAvailablePlacements(
  bids: Bid[],
  placements: Placement[],
  companyId: string,
): AvailablePlacementEntry[] {
  const myPlacementIds = new Set(getMyPlacements(bids, placements, companyId).map((p) => p.placement.id))
  return placements
    .filter((placement) => !myPlacementIds.has(placement.id))
    .map((placement) => {
      const ranked = getRankedBids(bids, placement.id)
      const leader = ranked[0] as RankedBid | undefined
      return { placement, ranked, leader }
    })
}

export interface TopBidderEntry {
  bid: RankedBid
  placement: Placement
  categoryId: string
}

/**
 * Cross-category "Top Bidders" — one row per ACTIVE bid on a
 * category_leaderboard placement, sorted by amount desc across every
 * category (or, when categoryId is given, within just that one). This is
 * deliberately one row per bid, not one row per company: a company with
 * bids in two categories (e.g. Fitness and Coffee) has two different
 * standings here, each tied to its own placement/category — never a
 * fabricated "global" bid. See getMyPlacements for the same
 * isolation/purity guarantee this shares.
 */
export function getTopBidders(bids: Bid[], placements: Placement[], categoryId?: string): TopBidderEntry[] {
  const categoryPlacements = placements.filter(
    (p) => p.type === 'category_leaderboard' && p.categoryId && (!categoryId || p.categoryId === categoryId),
  )

  return categoryPlacements
    .flatMap((placement) => getRankedBids(bids, placement.id).map((bid) => ({ bid, placement, categoryId: placement.categoryId! })))
    .sort((a, b) => b.bid.amount - a.bid.amount || new Date(a.bid.updatedAt).getTime() - new Date(b.bid.updatedAt).getTime())
}
