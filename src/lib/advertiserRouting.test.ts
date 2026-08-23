import { describe, it, expect } from 'vitest'
import { getBidCtaDestination } from './advertiserRouting'

describe('getBidCtaDestination', () => {
  it('sends a signed-out visitor to auth, regardless of company state', () => {
    expect(getBidCtaDestination({ signedIn: false, hasCompany: false })).toBe('auth')
    expect(getBidCtaDestination({ signedIn: false, hasCompany: true })).toBe('auth')
  })

  it('sends a signed-in user with a company straight to the bids tab', () => {
    expect(getBidCtaDestination({ signedIn: true, hasCompany: true })).toBe('dashboard-bids')
  })

  it('sends a signed-in user with no company to company creation', () => {
    expect(getBidCtaDestination({ signedIn: true, hasCompany: false })).toBe('dashboard-new')
  })
})
