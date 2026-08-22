import { describe, it, expect } from 'vitest'
import { getBidSubmitAction } from './bidPayment'

describe('getBidSubmitAction', () => {
  it('requires payment for a brand new bid (no current active amount)', () => {
    expect(getBidSubmitAction({ requestedAmount: 50, currentActiveAmount: null })).toBe('paid')
  })

  it('requires payment for raising an existing bid', () => {
    expect(getBidSubmitAction({ requestedAmount: 260, currentActiveAmount: 200 })).toBe('paid')
  })

  it('is free for lowering an existing bid', () => {
    expect(getBidSubmitAction({ requestedAmount: 150, currentActiveAmount: 200 })).toBe('free')
  })

  it('is free for resubmitting the exact same amount', () => {
    expect(getBidSubmitAction({ requestedAmount: 200, currentActiveAmount: 200 })).toBe('free')
  })

  it('requires payment for even a one-cent raise', () => {
    expect(getBidSubmitAction({ requestedAmount: 200.01, currentActiveAmount: 200 })).toBe('paid')
  })
})
