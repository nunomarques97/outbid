export type DealCtaState = 'expired' | 'own' | 'watching' | 'signedOut' | 'watchable'

export interface DealStateInput {
  expired: boolean
  signedIn: boolean
  managesCompany: boolean
  watching: boolean
}

/**
 * The single priority ladder for a deal's watch CTA, extracted out of
 * DealCard so it's unit-testable independent of rendering. Order matters:
 * an expired deal can't be watched regardless of who's asking; a company
 * member managing the deal's own company is blocked before "watching" is
 * even considered (mirrors the deal_claims RLS insert policy, which checks
 * expiry and self-ownership together — this is the same rule expressed as
 * a pure function for the UI).
 */
export function getDealCtaState({ expired, signedIn, managesCompany, watching }: DealStateInput): DealCtaState {
  if (expired) return 'expired'
  if (managesCompany) return 'own'
  if (watching) return 'watching'
  if (!signedIn) return 'signedOut'
  return 'watchable'
}
