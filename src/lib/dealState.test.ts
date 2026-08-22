import { describe, it, expect } from 'vitest'
import { getDealCtaState, type DealStateInput } from './dealState'

function state(overrides: Partial<DealStateInput> = {}): DealStateInput {
  return { expired: false, signedIn: true, managesCompany: false, claimed: false, ...overrides }
}

describe('getDealCtaState', () => {
  it('is claimable for a signed-in customer who has not claimed an active deal from another company', () => {
    expect(getDealCtaState(state())).toBe('claimable')
  })

  it('is claimed once the customer has claimed it', () => {
    expect(getDealCtaState(state({ claimed: true }))).toBe('claimed')
  })

  it('is signedOut for an anonymous visitor, even on an otherwise-claimable deal', () => {
    expect(getDealCtaState(state({ signedIn: false }))).toBe('signedOut')
  })

  it('is own for a company member managing the deal, regardless of claimed state', () => {
    expect(getDealCtaState(state({ managesCompany: true }))).toBe('own')
    expect(getDealCtaState(state({ managesCompany: true, claimed: true }))).toBe('own')
  })

  it('is expired once the deal has expired, overriding every other state', () => {
    expect(getDealCtaState(state({ expired: true }))).toBe('expired')
    expect(getDealCtaState(state({ expired: true, claimed: true }))).toBe('expired')
    expect(getDealCtaState(state({ expired: true, managesCompany: true }))).toBe('expired')
    expect(getDealCtaState(state({ expired: true, signedIn: false }))).toBe('expired')
  })

  it('prioritizes own-company over claimed when both are somehow true', () => {
    expect(getDealCtaState(state({ managesCompany: true, claimed: true }))).toBe('own')
  })
})
