import type { Deal } from '@/mocks/types'

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

/**
 * Deals for a "live/active only" surface (the homepage teaser) — unlike
 * getDeals()/sortDealsForDisplay(), which keeps expired deals (pushed to the
 * end) so /deals and a customer's own watch history can still find them,
 * this excludes expired deals entirely. Repcastr doesn't manually curate
 * which live deals appear, so the only two knobs are "is it still active"
 * and a deterministic order for the ones that are: soonest-expiring first,
 * same as the active portion of sortDealsForDisplay, then `id` as a final
 * tie-break so two deals expiring at the exact same instant still produce a
 * stable order.
 */
export function getActiveDealsForDisplay(deals: Deal[], limit: number, now: number = Date.now()): Deal[] {
  return [...deals]
    .filter((deal) => new Date(deal.expiresAt).getTime() > now)
    .sort((a, b) => {
      const byExpiry = new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
      return byExpiry !== 0 ? byExpiry : a.id.localeCompare(b.id)
    })
    .slice(0, limit)
}
