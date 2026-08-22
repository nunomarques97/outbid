export type DealCtaState = 'expired' | 'own' | 'claimed' | 'signedOut' | 'claimable'

export interface DealStateInput {
  expired: boolean
  signedIn: boolean
  managesCompany: boolean
  claimed: boolean
}

/**
 * The single priority ladder for a deal's claim CTA, extracted out of
 * DealCard so it's unit-testable independent of rendering. Order matters:
 * an expired deal can't be claimed regardless of who's asking; a company
 * member managing the deal's own company is blocked before "claimed" is
 * even considered (mirrors the deal_claims RLS insert policy, which checks
 * expiry and self-ownership together — this is the same rule expressed as
 * a pure function for the UI).
 */
export function getDealCtaState({ expired, signedIn, managesCompany, claimed }: DealStateInput): DealCtaState {
  if (expired) return 'expired'
  if (managesCompany) return 'own'
  if (claimed) return 'claimed'
  if (!signedIn) return 'signedOut'
  return 'claimable'
}
