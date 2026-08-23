export type AdvertiserCtaDestination = 'auth' | 'dashboard-bids' | 'dashboard-new'

export interface AdvertiserCtaInput {
  signedIn: boolean
  hasCompany: boolean
}

/**
 * Where a "start/manage bidding" homepage CTA should send the visitor —
 * the same three-way decision BidForPlacementCta's click handler makes,
 * extracted so it's unit-testable without mounting the component (this
 * project has no component-rendering test infra, only pure-logic tests —
 * see dealState.ts/claimState.ts for the established pattern). Never lands
 * a signed-in user with a company on the create-company form (one company
 * per account, it would just reject them) or a company-less user on a bid
 * screen with nothing to bid for.
 */
export function getBidCtaDestination({ signedIn, hasCompany }: AdvertiserCtaInput): AdvertiserCtaDestination {
  if (!signedIn) return 'auth'
  return hasCompany ? 'dashboard-bids' : 'dashboard-new'
}
