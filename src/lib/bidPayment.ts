export type BidSubmitAction = 'invalid' | 'rejected_lowering' | 'free_same' | 'paid_raise'

export interface BidSubmitDecision {
  action: BidSubmitAction
  /**
   * What Stripe should actually charge: target - current, rounded to
   * cents. Always 0 for every action except 'paid_raise' — the bid
   * itself still ends up at `targetAmount` once activated, this is only
   * the money that changes hands to get there.
   */
  chargeAmount: number
}

interface BidSubmitInput {
  targetAmount: number
  /** null = no active bid on this placement yet — treated as current = 0. */
  currentActiveAmount: number | null
}

/**
 * Outbid bids are one-way financial commitments: a company can raise a
 * bid (paying the delta above what it's already paying to hold) or leave
 * it exactly where it is (free, no-op), but it can never lower it
 * directly — that isn't a free action, it isn't an action at all. A
 * company that wants to reduce its commitment must withdraw and, if it
 * wants back in later, pay again for a brand-new bid (see place_bid()'s
 * matching server-side rejection, the actual source of truth, in
 * supabase/migrations/20260822050000_reject_bid_lowering.sql).
 *
 * This is a UX helper only — it decides which client path to call and
 * what to show the user before they commit, but the server independently
 * recomputes all of this from the database. The browser is never trusted
 * for the actual charge amount, and 'rejected_lowering' here is purely
 * advisory: even if this function were bypassed, the server rejects the
 * same case on its own.
 */
export function getBidSubmitDecision({ targetAmount, currentActiveAmount }: BidSubmitInput): BidSubmitDecision {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return { action: 'invalid', chargeAmount: 0 }
  }

  const target = roundToCents(targetAmount)
  const current = roundToCents(currentActiveAmount ?? 0)

  if (target < current) {
    return { action: 'rejected_lowering', chargeAmount: 0 }
  }

  if (target === current) {
    return { action: 'free_same', chargeAmount: 0 }
  }

  return { action: 'paid_raise', chargeAmount: roundToCents(target - current) }
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100
}
