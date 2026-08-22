export type BidSubmitAction = 'free' | 'paid' | 'invalid'

export interface BidSubmitDecision {
  action: BidSubmitAction
  /**
   * What Stripe should actually charge: max(target - current, 0), rounded
   * to cents. Always 0 for 'free' and 'invalid' — the bid itself still
   * ends up at `targetAmount` once activated, this is only the money that
   * changes hands to get there.
   */
  chargeAmount: number
}

interface BidSubmitInput {
  targetAmount: number
  /** null = no active bid on this placement yet — treated as current = 0. */
  currentActiveAmount: number | null
}

/**
 * Outbid never charges the full new bid amount on a raise — only the
 * delta above what the company is already paying to hold. Establishing a
 * bid where none exists is the same rule with current treated as 0.
 * Lowering (or resubmitting the same) amount is free: no new financial
 * commitment, and the prior payment is never retroactively refunded
 * either way.
 *
 * This is a UX helper only — it decides which client path to call and
 * what to show the user before they commit, but the server independently
 * recomputes all of this from the database (see create-bid-payment and
 * place_bid() in supabase/migrations/20260822040000_bid_payment_target_amount.sql).
 * The browser is never trusted for the actual charge amount.
 */
export function getBidSubmitDecision({ targetAmount, currentActiveAmount }: BidSubmitInput): BidSubmitDecision {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return { action: 'invalid', chargeAmount: 0 }
  }

  const current = currentActiveAmount ?? 0
  if (targetAmount <= current) {
    return { action: 'free', chargeAmount: 0 }
  }

  return { action: 'paid', chargeAmount: roundToCents(targetAmount - current) }
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100
}
