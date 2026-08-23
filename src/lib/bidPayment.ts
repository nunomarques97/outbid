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
 * Repcastr bids are one-way financial commitments: a company can raise a
 * bid (paying the delta above what it's already paying to hold) or leave
 * it exactly where it is (free, no-op), but it can never lower it, and
 * there is no withdrawal — a bid stays active, at whatever amount it was
 * last paid to, until a higher bid from someone else outranks it. The
 * only way to change position is to raise (see place_bid()'s matching
 * server-side rejection, the actual source of truth, in
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

/** A slider needs generous headroom by default, not just enough to fit today's minimum. */
const DEFAULT_SLIDER_RANGE = 100

/**
 * The lowest amount an OPENING bid (StartBidCard — no active bid from this
 * company yet) should let the user select. €1 is the true floor when
 * nobody's bidding; once someone is, the floor becomes "enough to take the
 * lead" rather than a token amount that would just sit behind them —
 * matches this bid always being framed as "your opening bid," not a
 * deliberately-losing one.
 */
export function getOpeningBidMinimum(leaderAmount: number): number {
  return leaderAmount > 0 ? leaderAmount + 1 : 1
}

/**
 * A slider ceiling that's always comfortably above `min` and never traps
 * `value` at the far end — extracted so both StartBidCard and
 * BidAdjustControl compute it identically. Not a business rule (the server
 * has no maximum at all, see place_bid); purely "give the thumb room to
 * move" UX.
 */
export function getBidSliderMax(min: number, value: number): number {
  return Math.max(DEFAULT_SLIDER_RANGE, min * 2, Math.ceil(value * 1.1))
}

/**
 * Normalizes a user-typed bid amount: rounds to the nearest whole euro
 * (this product has no fractional-euro bidding anywhere) and clamps up to
 * `min` — never NaN, never negative, never below the floor the UI is
 * currently enforcing. The server independently re-validates everything;
 * this only keeps the input field itself from ever showing a nonsensical
 * value.
 */
export function normalizeBidInput(raw: string, min: number): number {
  const parsed = Math.round(Number(raw))
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, parsed)
}
