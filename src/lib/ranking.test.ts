import { describe, it, expect } from 'vitest'
import {
  getRankedBids,
  isCompanyOutbid,
  getCategoryRanking,
  getGlobalBidStatus,
  getTopBidders,
  getTopCategoriesByBidTotal,
} from './ranking'
import type { Bid, Category, Company } from '@/mocks/types'

const GLOBAL = 'pl-global'

function makeBid(overrides: Partial<Bid> & Pick<Bid, 'id' | 'companyId' | 'amount'>): Bid {
  return {
    placementId: GLOBAL,
    status: 'active',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeCompany(overrides: Partial<Company> & Pick<Company, 'id'>): Company {
  return {
    slug: overrides.id,
    name: overrides.id,
    initials: 'XX',
    logoColor: '#000000',
    tagline: '',
    description: '',
    categoryIds: [],
    website: 'example.com',
    foundedYear: 2020,
    organicVotes: 0,
    tags: [],
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
    const ranked = getRankedBids(bids, GLOBAL)
    expect(ranked.map((b) => b.companyId)).toEqual(['c2', 'c3', 'c1'])
    expect(ranked.map((b) => b.rank)).toEqual([1, 2, 3])
  })

  it('moves a company above another once it bids higher', () => {
    const before = [
      makeBid({ id: 'b1', companyId: 'leader', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'challenger', amount: 650 }),
    ]
    expect(getRankedBids(before, GLOBAL)[0].companyId).toBe('leader')

    const after = [
      makeBid({ id: 'b1', companyId: 'leader', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'challenger', amount: 850, updatedAt: '2026-01-02T00:00:00Z' }),
    ]
    expect(getRankedBids(after, GLOBAL)[0].companyId).toBe('challenger')
  })

  it('excludes withdrawn/paused bids from the ranking', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'active-co', amount: 500 }),
      makeBid({ id: 'b2', companyId: 'withdrawn-co', amount: 900, status: 'paused' }),
    ]
    const ranked = getRankedBids(bids, GLOBAL)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].companyId).toBe('active-co')
  })

  it('breaks equal-amount ties deterministically (earlier updatedAt first), regardless of input order', () => {
    const earlier = makeBid({ id: 'b1', companyId: 'first', amount: 500, updatedAt: '2026-01-01T00:00:00Z' })
    const later = makeBid({ id: 'b2', companyId: 'second', amount: 500, updatedAt: '2026-01-05T00:00:00Z' })

    expect(getRankedBids([earlier, later], GLOBAL).map((b) => b.companyId)).toEqual(['first', 'second'])
    expect(getRankedBids([later, earlier], GLOBAL).map((b) => b.companyId)).toEqual(['first', 'second'])
  })

  it('only ranks bids for the given placement', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'c1', amount: 900, placementId: 'pl-other' }),
      makeBid({ id: 'b2', companyId: 'c2', amount: 100, placementId: GLOBAL }),
    ]
    expect(getRankedBids(bids, GLOBAL).map((b) => b.companyId)).toEqual(['c2'])
  })
})

describe('isCompanyOutbid', () => {
  it('is true when another active bid beats this company', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'leader', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'me', amount: 650 }),
    ]
    expect(isCompanyOutbid(bids, GLOBAL, 'me')).toBe(true)
  })

  it('is false while leading', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'me', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'other', amount: 650 }),
    ]
    expect(isCompanyOutbid(bids, GLOBAL, 'me')).toBe(false)
  })

  it('is false when the company has no bid on the placement', () => {
    const bids = [makeBid({ id: 'b1', companyId: 'other', amount: 800 })]
    expect(isCompanyOutbid(bids, GLOBAL, 'me')).toBe(false)
  })
})

describe('getGlobalBidStatus (dashboard, one company = one global bid)', () => {
  it('reports no bid for a company that has never bid', () => {
    const bids = [makeBid({ id: 'b1', companyId: 'other', amount: 500 })]
    const status = getGlobalBidStatus(bids, GLOBAL, 'me')
    expect(status.myBid).toBeUndefined()
    expect(status.outbid).toBe(false)
    expect(status.leader?.companyId).toBe('other')
  })

  it('reports the company is not outbid while leading', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'me', amount: 800 }),
      makeBid({ id: 'b2', companyId: 'other', amount: 300 }),
    ]
    const status = getGlobalBidStatus(bids, GLOBAL, 'me')
    expect(status.myBid?.amount).toBe(800)
    expect(status.outbid).toBe(false)
  })

  it('reports outbid once another company bids higher', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'me', amount: 300 }),
      makeBid({ id: 'b2', companyId: 'other', amount: 800 }),
    ]
    const status = getGlobalBidStatus(bids, GLOBAL, 'me')
    expect(status.outbid).toBe(true)
    expect(status.leader?.companyId).toBe('other')
  })

  it('switching which companyId is passed recomputes from scratch — never leaks the previous company\'s bid', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'company-a', amount: 200 }),
      makeBid({ id: 'b2', companyId: 'company-b', amount: 500 }),
    ]
    expect(getGlobalBidStatus(bids, GLOBAL, 'company-a').myBid?.companyId).toBe('company-a')
    expect(getGlobalBidStatus(bids, GLOBAL, 'company-b').myBid?.companyId).toBe('company-b')
    expect(getGlobalBidStatus(bids, GLOBAL, 'company-c').myBid).toBeUndefined()
  })
})

describe('getCategoryRanking', () => {
  const companies = [
    makeCompany({ id: 'starbucks', categoryIds: ['food-dining', 'shopping'], organicVotes: 10 }),
    makeCompany({ id: 'mcdonalds', categoryIds: ['food-dining'], organicVotes: 900 }),
    makeCompany({ id: 'company-x', categoryIds: ['food-dining'], organicVotes: 5 }),
    makeCompany({ id: 'unrelated', categoryIds: ['technology'], organicVotes: 99999 }),
  ]

  it('sponsored slots use the highest global bids among eligible companies only', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'starbucks', amount: 1000 }),
      makeBid({ id: 'b2', companyId: 'mcdonalds', amount: 700 }),
      makeBid({ id: 'b3', companyId: 'unrelated', amount: 999999 }), // not eligible — different category
    ]
    const { sponsored } = getCategoryRanking(companies, bids, GLOBAL, 'food-dining', 3)
    expect(sponsored.map((b) => b.companyId)).toEqual(['starbucks', 'mcdonalds'])
    expect(sponsored.map((b) => b.rank)).toEqual([1, 2]) // re-ranked within this category, not global rank
  })

  it('respects maxSponsoredSlots', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'starbucks', amount: 1000 }),
      makeBid({ id: 'b2', companyId: 'mcdonalds', amount: 700 }),
      makeBid({ id: 'b3', companyId: 'company-x', amount: 500 }),
    ]
    const { sponsored } = getCategoryRanking(companies, bids, GLOBAL, 'food-dining', 2)
    expect(sponsored.map((b) => b.companyId)).toEqual(['starbucks', 'mcdonalds'])
  })

  it('organic ranking ignores bid amount entirely — ordered purely by votes', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'starbucks', amount: 999999 }), // huge bid, but sponsored — excluded from organic
    ]
    const { organic } = getCategoryRanking(companies, bids, GLOBAL, 'food-dining', 3)
    // starbucks is sponsored (huge bid) so it's excluded here; mcdonalds (900 votes) beats company-x (5 votes)
    expect(organic.map((e) => e.company.id)).toEqual(['mcdonalds', 'company-x'])
  })

  it('a company can be #1 organic and simultaneously low/no sponsored rank, and vice versa', () => {
    // No bids at all: everyone is organic, ranked purely by votes.
    const { sponsored, organic } = getCategoryRanking(companies, [], GLOBAL, 'food-dining', 3)
    expect(sponsored).toEqual([])
    expect(organic.map((e) => e.company.id)).toEqual(['mcdonalds', 'starbucks', 'company-x'])
  })

  it('the same global bid makes a company eligible in every category it belongs to, unchanged', () => {
    const bids = [makeBid({ id: 'b1', companyId: 'starbucks', amount: 1000 })]
    const foodDining = getCategoryRanking(companies, bids, GLOBAL, 'food-dining', 3)
    const shopping = getCategoryRanking(companies, bids, GLOBAL, 'shopping', 3)
    expect(foodDining.sponsored[0].companyId).toBe('starbucks')
    expect(foodDining.sponsored[0].amount).toBe(1000)
    expect(shopping.sponsored[0].companyId).toBe('starbucks')
    expect(shopping.sponsored[0].amount).toBe(1000)
  })
})

describe('getTopBidders (one company = one global bid)', () => {
  const companies = [
    makeCompany({ id: 'starbucks', categoryIds: ['food-dining', 'shopping'] }),
    makeCompany({ id: 'mcdonalds', categoryIds: ['food-dining'] }),
    makeCompany({ id: 'tech-co', categoryIds: ['technology'] }),
  ]

  it('shows exactly one row per company, sorted by global bid amount', () => {
    const bids = [
      makeBid({ id: 'b1', companyId: 'mcdonalds', amount: 700 }),
      makeBid({ id: 'b2', companyId: 'starbucks', amount: 1000 }),
      makeBid({ id: 'b3', companyId: 'tech-co', amount: 400 }),
    ]
    const top = getTopBidders(companies, bids, GLOBAL)
    expect(top.map((t) => t.company.id)).toEqual(['starbucks', 'mcdonalds', 'tech-co'])
    expect(top.map((t) => t.bid.rank)).toEqual([1, 2, 3])
  })

  it('a company belonging to two categories still appears exactly once in the "all categories" view', () => {
    const bids = [makeBid({ id: 'b1', companyId: 'starbucks', amount: 1000 })]
    const top = getTopBidders(companies, bids, GLOBAL)
    expect(top.filter((t) => t.company.id === 'starbucks')).toHaveLength(1)
  })

  it('the category filter shows the same company with the identical bid amount in every eligible category', () => {
    const bids = [makeBid({ id: 'b1', companyId: 'starbucks', amount: 1000 })]
    const foodDining = getTopBidders(companies, bids, GLOBAL, 'food-dining')
    const shopping = getTopBidders(companies, bids, GLOBAL, 'shopping')
    expect(foodDining.map((t) => t.company.id)).toEqual(['starbucks'])
    expect(shopping.map((t) => t.company.id)).toEqual(['starbucks'])
    expect(foodDining[0].bid.amount).toBe(1000)
    expect(shopping[0].bid.amount).toBe(1000)
  })

  it('excludes a company from a category filter it does not belong to', () => {
    const bids = [makeBid({ id: 'b1', companyId: 'tech-co', amount: 5000 })]
    expect(getTopBidders(companies, bids, GLOBAL, 'food-dining')).toEqual([])
  })

  it('excludes companies with no active bid — nobody appears as sponsored without one', () => {
    expect(getTopBidders(companies, [], GLOBAL)).toEqual([])
  })
})

describe('getCategoryRanking (empty categories)', () => {
  it('returns empty sponsored and organic lists for a category with zero companies', () => {
    const { sponsored, organic } = getCategoryRanking([], [], GLOBAL, 'nobody-here', 3)
    expect(sponsored).toEqual([])
    expect(organic).toEqual([])
  })
})

function makeCategory(overrides: Partial<Category> & Pick<Category, 'id'>): Category {
  return { slug: overrides.id, name: overrides.id, icon: 'Sparkles', description: '', ...overrides }
}

describe('getTopCategoriesByBidTotal', () => {
  const categories = [
    makeCategory({ id: 'food-dining' }),
    makeCategory({ id: 'technology' }),
    makeCategory({ id: 'quiet-category' }),
  ]
  const companies = [
    makeCompany({ id: 'starbucks', categoryIds: ['food-dining'] }),
    makeCompany({ id: 'mcdonalds', categoryIds: ['food-dining'] }),
    makeCompany({ id: 'tech-a', categoryIds: ['technology'] }),
    makeCompany({ id: 'tech-b', categoryIds: ['technology'] }),
  ]
  const bids = [
    makeBid({ id: 'b1', companyId: 'starbucks', amount: 50000 }),
    makeBid({ id: 'b2', companyId: 'mcdonalds', amount: 20000 }),
    makeBid({ id: 'b3', companyId: 'tech-a', amount: 30000 }),
    makeBid({ id: 'b4', companyId: 'tech-b', amount: 20000 }),
  ]

  it('sums active global bids across every company eligible in each category, highest total first', () => {
    const top = getTopCategoriesByBidTotal(companies, bids, GLOBAL, categories, 3)
    expect(top.map((t) => ({ slug: t.category.slug, total: t.total }))).toEqual([
      { slug: 'food-dining', total: 70000 },
      { slug: 'technology', total: 50000 },
    ])
  })

  it('respects topN', () => {
    const top = getTopCategoriesByBidTotal(companies, bids, GLOBAL, categories, 1)
    expect(top).toHaveLength(1)
    expect(top[0].category.slug).toBe('food-dining')
  })

  it('excludes a category with zero sponsored spend', () => {
    const top = getTopCategoriesByBidTotal(companies, bids, GLOBAL, categories, 3)
    expect(top.some((t) => t.category.slug === 'quiet-category')).toBe(false)
  })
})
