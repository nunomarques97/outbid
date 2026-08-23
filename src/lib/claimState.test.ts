import { describe, it, expect } from 'vitest'
import { getClaimCtaState, type ClaimStateInput } from './claimState'

function state(overrides: Partial<ClaimStateInput> = {}): ClaimStateInput {
  return { signedIn: true, managesAnyCompany: false, hasPendingClaim: false, ...overrides }
}

describe('getClaimCtaState', () => {
  it('is claimable for a signed-in user who manages no company and has no pending claim', () => {
    expect(getClaimCtaState(state())).toBe('claimable')
  })

  it('is signedOut for an anonymous visitor', () => {
    expect(getClaimCtaState(state({ signedIn: false }))).toBe('signedOut')
  })

  it('is pending once the user has a pending claim on this company', () => {
    expect(getClaimCtaState(state({ hasPendingClaim: true }))).toBe('pending')
  })

  it('is hidden for a user who already manages a company, regardless of other state', () => {
    expect(getClaimCtaState(state({ managesAnyCompany: true }))).toBe('hidden')
    expect(getClaimCtaState(state({ managesAnyCompany: true, hasPendingClaim: true }))).toBe('hidden')
  })

  it('prioritizes hidden over pending when both are somehow true', () => {
    expect(getClaimCtaState(state({ managesAnyCompany: true, hasPendingClaim: true }))).toBe('hidden')
  })
})
