import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import {
  getCategories,
  getCompanyBySlug,
  getCompaniesByCategory,
  getAllCompanies,
  getMyCompanies,
  getPlacements,
  getAllActiveBids,
  getBattles,
  getBattleById,
  getDeals,
  getTrends,
  getAllCompanyRatingSummaries,
  getBidPaymentsForCompany,
  getPublicProfileByUsername,
  getUserInterestCategoryIds,
  getReviewsByUserPaginated,
  searchProfiles,
  getReviewAuthorInfoByIds,
} from './queries'

/**
 * Central place for every read-side React Query hook, so pages never call
 * `supabase` directly — they call one of these. Query keys are shared
 * across pages on purpose (e.g. every page that needs categories uses the
 * same ['categories'] key) so navigating between pages reuses the cache
 * instead of re-fetching. `staleTime` is set because this is reference/
 * content data that doesn't change from one click to the next — no reason
 * to refetch it on every remount within a session.
 */

const STALE_TIME = 60_000

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: STALE_TIME })
}

export function useCompany(slug: string) {
  return useQuery({
    queryKey: ['company', slug],
    queryFn: () => getCompanyBySlug(slug),
    staleTime: STALE_TIME,
    enabled: Boolean(slug),
  })
}

export function useCompaniesByCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['companiesByCategory', categoryId],
    queryFn: () => getCompaniesByCategory(categoryId!),
    staleTime: STALE_TIME,
    enabled: Boolean(categoryId),
  })
}

export function useAllCompanies() {
  return useQuery({ queryKey: ['companies'], queryFn: getAllCompanies, staleTime: STALE_TIME })
}

/**
 * Companies the signed-in user actually manages, via company_members —
 * never a hardcoded account. Disabled (no request at all) when signed out
 * or unconfigured, same gating pattern as useCompanyVote/useBattleVote.
 */
export function useMyCompanies() {
  const { user, isConfigured } = useAuth()
  return useQuery({
    queryKey: ['myCompanies', user?.id],
    queryFn: () => getMyCompanies(user!.id),
    enabled: isConfigured && Boolean(user),
  })
}

export function usePlacements() {
  return useQuery({ queryKey: ['placements'], queryFn: getPlacements, staleTime: STALE_TIME })
}

export function useActiveBids() {
  return useQuery({ queryKey: ['activeBids'], queryFn: getAllActiveBids, staleTime: STALE_TIME })
}

export function useBattles() {
  return useQuery({ queryKey: ['battles'], queryFn: getBattles, staleTime: STALE_TIME })
}

export function useBattle(id: string | undefined) {
  return useQuery({
    queryKey: ['battle', id],
    queryFn: () => getBattleById(id!),
    staleTime: STALE_TIME,
    enabled: Boolean(id),
  })
}

export function useDeals() {
  return useQuery({ queryKey: ['deals'], queryFn: getDeals, staleTime: STALE_TIME })
}

export function useTrends() {
  return useQuery({ queryKey: ['trends'], queryFn: getTrends, staleTime: STALE_TIME })
}

/**
 * Every company's rating summary at once, for discovery surfaces (search
 * results, leaderboard entries) showing many companies side by side — see
 * getAllCompanyRatingSummaries for why "fetch everything" is the right
 * shape here. The company profile page uses its own single-company query
 * instead (see features/reviews/useReviews.ts), since that one needs to
 * invalidate cleanly after this exact user posts/edits/deletes a review.
 */
export function useAllCompanyRatingSummaries() {
  return useQuery({ queryKey: ['ratingSummaries'], queryFn: getAllCompanyRatingSummaries, staleTime: STALE_TIME })
}

/**
 * A company's own Stripe bid-payment history (dashboard Billing tab only —
 * RLS already restricts this to companies the caller manages, same as
 * every other write-scoped read here). Disabled with no request until a
 * companyId is known, same gating pattern as useMyCompanies.
 */
export function useBidPayments(companyId: string | undefined) {
  return useQuery({
    queryKey: ['bidPayments', companyId],
    queryFn: () => getBidPaymentsForCompany(companyId!),
    staleTime: STALE_TIME,
    enabled: Boolean(companyId),
  })
}

/**
 * A public customer profile by username — returns null for both "doesn't
 * exist" and "private, and you're not the owner" (RLS makes those
 * indistinguishable on purpose, see getPublicProfileByUsername).
 */
export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['publicProfile', username],
    queryFn: () => getPublicProfileByUsername(username!),
    enabled: Boolean(username),
  })
}

export function useUserInterests(userId: string | undefined) {
  return useQuery({
    queryKey: ['userInterests', userId],
    queryFn: () => getUserInterestCategoryIds(userId!),
    enabled: Boolean(userId),
  })
}

const REVIEW_PAGE_SIZE = 5

/** "Load more" pagination for a public profile's review list — never fetches the whole history at once. */
export function useUserReviews(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['userReviews', userId],
    queryFn: ({ pageParam }) => getReviewsByUserPaginated(userId!, REVIEW_PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length * REVIEW_PAGE_SIZE : undefined),
    enabled: Boolean(userId),
  })
}

export function useSearchProfiles(query: string) {
  const needle = query.trim()
  return useQuery({
    queryKey: ['searchProfiles', needle],
    queryFn: () => searchProfiles(needle),
    enabled: needle.length > 0,
  })
}

/** Powers clickable review-author links + their real avatar — see getReviewAuthorInfoByIds for why a missing id just means "don't link, use the default avatar." */
export function useReviewAuthors(userIds: string[]) {
  const key = [...new Set(userIds)].sort().join(',')
  return useQuery({
    queryKey: ['reviewAuthors', key],
    queryFn: () => getReviewAuthorInfoByIds(userIds),
    enabled: userIds.length > 0,
  })
}
