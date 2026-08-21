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
