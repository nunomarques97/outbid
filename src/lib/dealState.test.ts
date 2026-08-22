import { describe, it, expect } from 'vitest'
import type { Deal } from '@/mocks/types'
import { getDealCtaState, getActiveDealsForDisplay, type DealStateInput } from './dealState'

function state(overrides: Partial<DealStateInput> = {}): DealStateInput {
  return { expired: false, signedIn: true, managesCompany: false, watching: false, ...overrides }
}

describe('getDealCtaState', () => {
  it('is watchable for a signed-in customer who is not watching an active deal from another company', () => {
    expect(getDealCtaState(state())).toBe('watchable')
  })

  it('is watching once the customer is watching it', () => {
    expect(getDealCtaState(state({ watching: true }))).toBe('watching')
  })

  it('is signedOut for an anonymous visitor, even on an otherwise-watchable deal', () => {
    expect(getDealCtaState(state({ signedIn: false }))).toBe('signedOut')
  })

  it('is own for a company member managing the deal, regardless of watching state', () => {
    expect(getDealCtaState(state({ managesCompany: true }))).toBe('own')
    expect(getDealCtaState(state({ managesCompany: true, watching: true }))).toBe('own')
  })

  it('is expired once the deal has expired, overriding every other state', () => {
    expect(getDealCtaState(state({ expired: true }))).toBe('expired')
    expect(getDealCtaState(state({ expired: true, watching: true }))).toBe('expired')
    expect(getDealCtaState(state({ expired: true, managesCompany: true }))).toBe('expired')
    expect(getDealCtaState(state({ expired: true, signedIn: false }))).toBe('expired')
  })

  it('prioritizes own-company over watching when both are somehow true', () => {
    expect(getDealCtaState(state({ managesCompany: true, watching: true }))).toBe('own')
  })
})

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 'deal-1',
    type: 'deal',
    companyId: 'company-1',
    title: 'Test deal',
    discountLabel: '10% off',
    expiresAt: '2026-09-01T00:00:00.000Z',
    description: 'Test description',
    claimCount: 0,
    ...overrides,
  }
}

const NOW = new Date('2026-08-22T00:00:00.000Z').getTime()

describe('getActiveDealsForDisplay', () => {
  it('includes a deal that expires in the future', () => {
    const active = deal({ id: 'active', expiresAt: '2026-09-01T00:00:00.000Z' })
    expect(getActiveDealsForDisplay([active], 3, NOW)).toEqual([active])
  })

  it('excludes a deal that has already expired', () => {
    const expired = deal({ id: 'expired', expiresAt: '2026-08-01T00:00:00.000Z' })
    expect(getActiveDealsForDisplay([expired], 3, NOW)).toEqual([])
  })

  it('orders multiple active deals deterministically by soonest-expiring first', () => {
    const soon = deal({ id: 'soon', expiresAt: '2026-08-25T00:00:00.000Z' })
    const later = deal({ id: 'later', expiresAt: '2026-09-15T00:00:00.000Z' })
    expect(getActiveDealsForDisplay([later, soon], 3, NOW)).toEqual([soon, later])
  })

  it('breaks an exact expiry tie by id, so ordering never depends on input order', () => {
    const a = deal({ id: 'a', expiresAt: '2026-09-01T00:00:00.000Z' })
    const b = deal({ id: 'b', expiresAt: '2026-09-01T00:00:00.000Z' })
    expect(getActiveDealsForDisplay([b, a], 3, NOW)).toEqual([a, b])
    expect(getActiveDealsForDisplay([a, b], 3, NOW)).toEqual([a, b])
  })

  it('returns an empty array when there are no active deals', () => {
    const expired = deal({ id: 'expired', expiresAt: '2026-01-01T00:00:00.000Z' })
    expect(getActiveDealsForDisplay([expired], 3, NOW)).toEqual([])
    expect(getActiveDealsForDisplay([], 3, NOW)).toEqual([])
  })

  it('respects the limit even when more active deals exist', () => {
    const deals = [
      deal({ id: 'a', expiresAt: '2026-08-23T00:00:00.000Z' }),
      deal({ id: 'b', expiresAt: '2026-08-24T00:00:00.000Z' }),
      deal({ id: 'c', expiresAt: '2026-08-25T00:00:00.000Z' }),
    ]
    expect(getActiveDealsForDisplay(deals, 2, NOW)).toEqual([deals[0], deals[1]])
  })
})
