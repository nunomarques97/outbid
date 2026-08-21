import { describe, it, expect } from 'vitest'
import { getRankedBids, getSponsoredSlice, isCompanyOutbid, getOrganicRanking } from './ranking'
import type { Bid } from '@/mocks/types'
// Test-only use of the mock fixtures as sample domain data (companies/
// placements) to exercise getOrganicRanking's pure logic — this is not an
// application data source, just a convenient, realistic fixture set.
import { getCompaniesByCategory } from '@/mocks/companies'
import { getPlacementForCategory } from '@/mocks/placements'

function makeBid(overrides: Partial<Bid> & Pick<Bid, 'id' | 'companyId' | 'amount'>): Bid {
  return {
    placementId: 'pl-test',
    status: 'active',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getRankedBids', () => {
  it('orders active bids by amount, highest first', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'c1', amount: 400 }),
      makeBid({ id: 'b2', companyId: 'c2', amount: 800 }),
      makeBid({ id: 'b3', companyId: 'c3', amount: 600 }),
    ]
    const ranked = getRankedBids(bids, 'pl-test')
    expect(ranked.map((b) => b.companyId)).toEqual(['c2', 'c3', 'c1'])
    expect(ranked.map((b) => b.rank)).toEqual([1, 2, 3])
  })

  it('moves a company above another once it bids higher', () => {
    const before = [
      makeBid({ id: 'b1', companyId: 'leader', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'challenger', amount: 650 }),
    ]
    expect(getRankedBids(before, 'pl-test')[0].companyId).toBe('leader')

    const after = [
      makeBid({ id: 'b1', companyId: 'leader', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'challenger', amount: 850, updatedAt: '2026-01-02T00:00:00Z' }),
    ]
    expect(getRankedBids(after, 'pl-test')[0].companyId).toBe('challenger')
  })

  it('excludes withdrawn/paused bids from the ranking', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'active-co', amount: 500 }),
      makeBid({ id: 'b2', companyId: 'withdrawn-co', amount: 900, status: 'paused' }),
    ]
    const ranked = getRankedBids(bids, 'pl-test')
    expect(ranked).toHaveLength(1)
    expect(ranked[0].companyId).toBe('active-co')
  })

  it('breaks equal-amount ties deterministically (earlier updatedAt first), regardless of input order', () => {
    const earlier = makeBid({ id: 'b1', companyId: 'first', amount: 500, updatedAt: '2026-01-01T00:00:00Z' })
    const later = makeBid({ id: 'b2', companyId: 'second', amount: 500, updatedAt: '2026-01-05T00:00:00Z' })

    expect(getRankedBids([earlier, later], 'pl-test').map((b) => b.companyId)).toEqual(['first', 'second'])
    expect(getRankedBids([later, earlier], 'pl-test').map((b) => b.companyId)).toEqual(['first', 'second'])
  })

  it('only ranks bids for the given placement', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'c1', amount: 900, placementId: 'pl-other' }),
      makeBid({ id: 'b2', companyId: 'c2', amount: 100, placementId: 'pl-test' }),
    ]
    expect(getRankedBids(bids, 'pl-test').map((b) => b.companyId)).toEqual(['c2'])
  })
})

describe('getSponsoredSlice', () => {
  it('returns only the top N active bids', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'c1', amount: 400 }),
      makeBid({ id: 'b2', companyId: 'c2', amount: 800 }),
      makeBid({ id: 'b3', companyId: 'c3', amount: 600 }),
    ]
    expect(getSponsoredSlice(bids, 'pl-test', 2).map((b) => b.companyId)).toEqual(['c2', 'c3'])
  })
})

describe('isCompanyOutbid', () => {
  it('is true when another active bid beats this company', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'leader', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'me', amount: 650 }),
    ]
    expect(isCompanyOutbid(bids, 'pl-test', 'me')).toBe(true)
  })

  it('is false while leading', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'me', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'other', amount: 650 }),
    ]
    expect(isCompanyOutbid(bids, 'pl-test', 'me')).toBe(false)
  })

  it('is false when the company has no bid on the placement', () => {
    const bids = [makeBid({ id: 'b1', companyId: 'other', amount: 800 })]
    expect(isCompanyOutbid(bids, 'pl-test', 'me')).toBe(false)
  })
})

describe('getOrganicRanking', () => {
  // Uses the mock fixtures as sample data (cat-pm has 5 companies: flowstack
  // 3420, taskwave 2870, pathforge 4180, cadence-hq 1540, sprintly 2260
  // votes) purely to exercise the ordering/exclusion logic — organicVotes on
  // each company is treated as an already-resolved total, same as a real
  // Supabase-backed caller would pass in.
  const pmCompanies = getCompaniesByCategory('cat-pm')
  const pmPlacement = getPlacementForCategory('cat-pm') ?? null

  it('orders companies purely by votes when nobody is sponsored', () => {
    const ranking = getOrganicRanking(pmCompanies, [], pmPlacement)
    expect(ranking.map((e) => e.company.slug)).toEqual(['pathforge', 'flowstack', 'taskwave', 'sprintly', 'cadence-hq'])
  })

  it('stays independent of bid amounts: relative vote order among non-sponsored companies never changes', () => {
    const noBids = getOrganicRanking(pmCompanies, [], pmPlacement)
    const withoutTaskwave = noBids.filter((e) => e.company.slug !== 'taskwave').map((e) => e.company.slug)

    // Give taskwave a huge (but irrelevant-to-votes) sponsored bid so it's
    // excluded from the organic list entirely.
    const bidsMakingTaskwaveSponsored: Bid[] = [
      makeBid({ id: 'b1', companyId: 'co-taskwave', amount: 999999, placementId: 'pl-pm' }),
    ]
    const withTaskwaveSponsored = getOrganicRanking(pmCompanies, bidsMakingTaskwaveSponsored, pmPlacement)

    expect(withTaskwaveSponsored.map((e) => e.company.slug)).toEqual(withoutTaskwave)
  })
})
