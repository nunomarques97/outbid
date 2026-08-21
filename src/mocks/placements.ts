import type { Placement } from './types'

export const placements: Placement[] = [
  { id: 'pl-pm', type: 'category_leaderboard', categoryId: 'cat-pm', maxSponsoredSlots: 3 },
  { id: 'pl-coffee', type: 'category_leaderboard', categoryId: 'cat-coffee', maxSponsoredSlots: 3 },
  { id: 'pl-hosting', type: 'category_leaderboard', categoryId: 'cat-hosting', maxSponsoredSlots: 3 },
  { id: 'pl-fitness', type: 'category_leaderboard', categoryId: 'cat-fitness', maxSponsoredSlots: 3 },
  { id: 'pl-homepage', type: 'homepage_featured', maxSponsoredSlots: 4 },
  { id: 'pl-deal-spotlight', type: 'deal_spotlight', maxSponsoredSlots: 2 },
]

export function getPlacementForCategory(categoryId: string) {
  return placements.find((p) => p.type === 'category_leaderboard' && p.categoryId === categoryId)
}
