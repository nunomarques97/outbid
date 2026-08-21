import type { AdvertiserAccount, Bid } from './types'

export const bids: Bid[] = [
  // Project Management Tools leaderboard — Flowstack (our demo advertiser) just got outbid
  { id: 'bid-pm-1', companyId: 'co-pathforge', placementId: 'pl-pm', amount: 780, status: 'active', updatedAt: '2026-08-20T09:12:00Z' },
  { id: 'bid-pm-2', companyId: 'co-flowstack', placementId: 'pl-pm', amount: 650, previousAmount: 600, status: 'outbid', updatedAt: '2026-08-19T14:30:00Z' },
  { id: 'bid-pm-3', companyId: 'co-taskwave', placementId: 'pl-pm', amount: 420, status: 'active', updatedAt: '2026-08-17T11:00:00Z' },

  // Coffee Roasters leaderboard
  { id: 'bid-coffee-1', companyId: 'co-northbound', placementId: 'pl-coffee', amount: 560, status: 'active', updatedAt: '2026-08-18T10:00:00Z' },
  { id: 'bid-coffee-2', companyId: 'co-emberoak', placementId: 'pl-coffee', amount: 410, status: 'active', updatedAt: '2026-08-16T08:45:00Z' },
  { id: 'bid-coffee-3', companyId: 'co-ridgeline', placementId: 'pl-coffee', amount: 290, status: 'active', updatedAt: '2026-08-15T09:30:00Z' },

  // Web Hosting leaderboard
  { id: 'bid-hosting-1', companyId: 'co-corestack', placementId: 'pl-hosting', amount: 910, status: 'active', updatedAt: '2026-08-20T07:00:00Z' },
  { id: 'bid-hosting-2', companyId: 'co-nimbus', placementId: 'pl-hosting', amount: 680, status: 'active', updatedAt: '2026-08-19T16:20:00Z' },
  { id: 'bid-hosting-3', companyId: 'co-anchorpoint', placementId: 'pl-hosting', amount: 430, status: 'active', updatedAt: '2026-08-14T12:00:00Z' },

  // Fitness Apps leaderboard
  { id: 'bid-fitness-1', companyId: 'co-ironloop', placementId: 'pl-fitness', amount: 640, status: 'active', updatedAt: '2026-08-19T10:00:00Z' },
  { id: 'bid-fitness-2', companyId: 'co-pulseform', placementId: 'pl-fitness', amount: 520, status: 'active', updatedAt: '2026-08-18T09:00:00Z' },
  { id: 'bid-fitness-3', companyId: 'co-momentum', placementId: 'pl-fitness', amount: 310, status: 'active', updatedAt: '2026-08-13T15:00:00Z' },

  // Homepage featured — Flowstack is currently in the lead here
  { id: 'bid-hp-1', companyId: 'co-flowstack', placementId: 'pl-homepage', amount: 1250, status: 'active', updatedAt: '2026-08-20T09:00:00Z' },
  { id: 'bid-hp-2', companyId: 'co-corestack', placementId: 'pl-homepage', amount: 1200, status: 'active', updatedAt: '2026-08-19T11:00:00Z' },
  { id: 'bid-hp-3', companyId: 'co-northbound', placementId: 'pl-homepage', amount: 860, status: 'active', updatedAt: '2026-08-17T13:00:00Z' },
  { id: 'bid-hp-4', companyId: 'co-ironloop', placementId: 'pl-homepage', amount: 750, status: 'active', updatedAt: '2026-08-16T10:00:00Z' },

  // Deal spotlight
  { id: 'bid-deal-1', companyId: 'co-nimbus', placementId: 'pl-deal-spotlight', amount: 430, status: 'active', updatedAt: '2026-08-18T12:00:00Z' },
  { id: 'bid-deal-2', companyId: 'co-fernweh', placementId: 'pl-deal-spotlight', amount: 260, status: 'active', updatedAt: '2026-08-15T12:00:00Z' },
]

export const advertiserAccount: AdvertiserAccount = {
  companyId: 'co-flowstack',
  displayName: 'Flowstack',
}

export function getBidsForPlacement(placementId: string) {
  return bids
    .filter((b) => b.placementId === placementId && b.status !== 'paused')
    .sort((a, b) => b.amount - a.amount)
}
