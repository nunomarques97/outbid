import { describe, it, expect } from 'vitest'
import { getDealCtaState, type DealStateInput } from './dealState'

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
