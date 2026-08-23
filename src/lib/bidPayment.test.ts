import { describe, it, expect } from 'vitest'
import { getBidSubmitDecision, getOpeningBidMinimum, getBidSliderMax, normalizeBidInput } from './bidPayment'

describe('getBidSubmitDecision', () => {
  it('charges the full amount for a brand new bid (no active bid, current treated as 0)', () => {
    expect(getBidSubmitDecision({ targetAmount: 10, currentActiveAmount: null })).toEqual({
      action: 'paid_raise',
      chargeAmount: 10,
    })
  })

  it('raising 10 -> 20 is paid, but only charges the 10 delta, not the full new amount', () => {
    expect(getBidSubmitDecision({ targetAmount: 20, currentActiveAmount: 10 })).toEqual({
      action: 'paid_raise',
      chargeAmount: 10,
    })
  })

  it('raising 20 -> 25 is paid, charging only the 5 delta', () => {
    expect(getBidSubmitDecision({ targetAmount: 25, currentActiveAmount: 20 })).toEqual({
      action: 'paid_raise',
      chargeAmount: 5,
    })
  })

  it('resubmitting the same amount is free, not a raise', () => {
    expect(getBidSubmitDecision({ targetAmount: 20, currentActiveAmount: 20 })).toEqual({
      action: 'free_same',
      chargeAmount: 0,
    })
  })

  it('rejects lowering 20 -> 15 — never "free"', () => {
    expect(getBidSubmitDecision({ targetAmount: 15, currentActiveAmount: 20 })).toEqual({
      action: 'rejected_lowering',
      chargeAmount: 0,
    })
  })

  it('rejects lowering 20 -> 10 — never "free"', () => {
    expect(getBidSubmitDecision({ targetAmount: 10, currentActiveAmount: 20 })).toEqual({
      action: 'rejected_lowering',
      chargeAmount: 0,
    })
  })

  it('rejects invalid target amounts', () => {
    expect(getBidSubmitDecision({ targetAmount: 0, currentActiveAmount: null }).action).toBe('invalid')
    expect(getBidSubmitDecision({ targetAmount: -10, currentActiveAmount: 5 }).action).toBe('invalid')
    expect(getBidSubmitDecision({ targetAmount: NaN, currentActiveAmount: null }).action).toBe('invalid')
    expect(getBidSubmitDecision({ targetAmount: Infinity, currentActiveAmount: null }).action).toBe('invalid')
  })

  it('rounds the charge amount to cents', () => {
    expect(getBidSubmitDecision({ targetAmount: 10.005, currentActiveAmount: 10 }).chargeAmount).toBeCloseTo(0.01, 2)
  })

  // €1 minimum bid / €1 increment (see BidAdjustControl/StartBidCard) — this
  // function was already amount-agnostic, but these pin down the exact
  // low end of the range the UI now offers.
  it('a brand new €1 bid charges exactly €1 — the true minimum spend', () => {
    expect(getBidSubmitDecision({ targetAmount: 1, currentActiveAmount: null })).toEqual({
      action: 'paid_raise',
      chargeAmount: 1,
    })
  })

  it('raising 1 -> 2 charges only the €1 delta', () => {
    expect(getBidSubmitDecision({ targetAmount: 2, currentActiveAmount: 1 })).toEqual({
      action: 'paid_raise',
      chargeAmount: 1,
    })
  })
})

describe('getOpeningBidMinimum', () => {
  it('is €1 when nobody is bidding yet', () => {
    expect(getOpeningBidMinimum(0)).toBe(1)
  })

  it('is leader + 1 when there is a current leader — €10 leader means €11 minimum', () => {
    expect(getOpeningBidMinimum(10)).toBe(11)
  })

  it('scales with an arbitrarily high leader amount', () => {
    expect(getOpeningBidMinimum(250)).toBe(251)
  })
})

describe('getBidSliderMax', () => {
  it('never shrinks below the default range even for a tiny minimum', () => {
    expect(getBidSliderMax(1, 1)).toBeGreaterThanOrEqual(100)
  })

  it('extends past the minimum so the slider is not a useless €1 sliver (the reported bug)', () => {
    const max = getBidSliderMax(1, 1)
    expect(max).toBeGreaterThan(2)
  })

  it('extends to accommodate a value typed above the default range', () => {
    expect(getBidSliderMax(1, 500)).toBeGreaterThanOrEqual(500)
  })

  it('scales with a high minimum (e.g. a high leader amount)', () => {
    expect(getBidSliderMax(300, 300)).toBeGreaterThanOrEqual(600)
  })
})

describe('normalizeBidInput', () => {
  it('accepts a direct whole-euro amount like 10', () => {
    expect(normalizeBidInput('10', 1)).toBe(10)
  })

  it('rounds a fractional typed value to the nearest whole euro', () => {
    expect(normalizeBidInput('10.6', 1)).toBe(11)
  })

  it('clamps a value below the minimum up to the minimum — invalid values are never allowed through', () => {
    expect(normalizeBidInput('0', 11)).toBe(11)
    expect(normalizeBidInput('5', 11)).toBe(11)
  })

  it('clamps a negative value up to the minimum', () => {
    expect(normalizeBidInput('-20', 1)).toBe(1)
  })

  it('falls back to the minimum for non-numeric input (e.g. a cleared field)', () => {
    expect(normalizeBidInput('', 1)).toBe(1)
    expect(normalizeBidInput('abc', 5)).toBe(5)
  })

  it('is idempotent with getOpeningBidMinimum — typing below a €10 leader clamps to €11', () => {
    const min = getOpeningBidMinimum(10)
    expect(normalizeBidInput('5', min)).toBe(11)
    expect(normalizeBidInput('11', min)).toBe(11)
    expect(normalizeBidInput('25', min)).toBe(25)
  })
})
