export type BidSubmitAction = 'free' | 'paid'

interface BidSubmitInput {
  requestedAmount: number
  /** null = no active bid on this placement yet. */
  currentActiveAmount: number | null
}

/**
 * Establishing a new bid, or raising an existing one, is a paid action —
 * Outbid has no recurring billing, so this is the only place money changes
 * hands. Lowering (or resubmitting the same) amount on a bid already paid
 * for is free: no new financial commitment is being made, and the prior
 * payment is never retroactively refunded either way.
 *
 * Mirrors place_bid()'s own server-side check exactly (see
 * supabase/migrations/20260822000000_bid_payments.sql) — this only decides
 * which client path to call, it enforces nothing on its own.
 */
export function getBidSubmitAction({ requestedAmount, currentActiveAmount }: BidSubmitInput): BidSubmitAction {
  if (currentActiveAmount === null || requestedAmount > currentActiveAmount) return 'paid'
  return 'free'
}
