import { describe, it, expect } from 'vitest'
import { getBidSubmitDecision } from './bidPayment'

describe('getBidSubmitDecision', () => {
  it('charges the full amount for a brand new bid (no active bid, current treated as 0)', () => {
    expect(getBidSubmitDecision({ targetAmount: 10, currentActiveAmount: null })).toEqual({
      action: 'paid',
      chargeAmount: 10,
    })
  })

  it('raising 10 -> 20 is paid, but only charges the 10 delta, not the full new amount', () => {
    expect(getBidSubmitDecision({ targetAmount: 20, currentActiveAmount: 10 })).toEqual({
      action: 'paid',
      chargeAmount: 10,
    })
  })

  it('raising 10 -> 15 is paid, charging only the 5 delta', () => {
    expect(getBidSubmitDecision({ targetAmount: 15, currentActiveAmount: 10 })).toEqual({
      action: 'paid',
      chargeAmount: 5,
    })
  })

  it('resubmitting the same amount is free', () => {
    expect(getBidSubmitDecision({ targetAmount: 20, currentActiveAmount: 20 })).toEqual({
      action: 'free',
      chargeAmount: 0,
    })
  })

  it('lowering is free, with no refund/credit implied', () => {
    expect(getBidSubmitDecision({ targetAmount: 15, currentActiveAmount: 20 })).toEqual({
      action: 'free',
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
})
