export type PlacementType =
  | 'category_leaderboard'
  | 'homepage_featured'
  | 'comparison_sponsor'
  | 'deal_spotlight'
  | 'global_sponsored'

export interface Category {
  id: string
  slug: string
  name: string
  icon: string
  description: string
  /** True for a category merged into a broader one — kept for historical reference (labels on old records), never shown in discovery/picker UI. Mock categories never set this. */
  isArchived?: boolean
}

export interface Company {
  id: string
  slug: string
  name: string
  initials: string
  logoColor: string
  tagline: string
  description: string
  categoryIds: string[]
  website: string
  foundedYear: number
  organicVotes: number
  tags: string[]
  /** Real uploaded logo, resolved to a public URL — null/undefined means "use the initials avatar". Mock companies never set this. */
  logoUrl?: string | null
  /** Storage path backing logoUrl, needed to clean up the old file when replacing a logo. Mock companies never set this. */
  logoPath?: string | null
  /** Repcastr has confirmed a real representative controls this profile — see company_verifications. Never true just because the company was created, has a bid, or was paid for. Optional/absent means unverified, same as `logoUrl`/`logoPath` above — mock companies never set this. */
  isVerified?: boolean
}

export interface Placement {
  id: string
  type: PlacementType
  categoryId?: string
  maxSponsoredSlots: number
}

export type BidStatus = 'active' | 'outbid' | 'paused'

export interface Bid {
  id: string
  companyId: string
  placementId: string
  amount: number
  status: BidStatus
  previousAmount?: number
  updatedAt: string
}

export interface BattleCriterion {
  label: string
  aValue: string
  bValue: string
  winner: 'a' | 'b' | 'tie'
}

export interface Battle {
  id: string
  type: 'battle'
  companyAId: string
  companyBId: string
  votesA: number
  votesB: number
  criteria: BattleCriterion[]
}

export interface Deal {
  id: string
  type: 'deal'
  companyId: string
  title: string
  discountLabel: string
  expiresAt: string
  description: string
  /** Total interest signal — baseline + real watches. Mock deals never set watchCount beyond their baseline. */
  claimCount: number
  /** Bare domain/path, no protocol (same convention as Company.website's storage). Null/undefined means "use the company's own website" — mock deals never set this. */
  destinationUrl?: string | null
}

export interface Trend {
  id: string
  type: 'trend'
  title: string
  summary: string
  relatedCompanyIds: string[]
  trendScore: number
  publishedAt: string
}

export type ContentItem = Battle | Deal | Trend

export interface AdvertiserAccount {
  companyId: string
  displayName: string
}
