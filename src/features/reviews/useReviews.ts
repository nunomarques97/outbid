import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { getReviewsForCompany, getMyReviewForCompany, getReviewsByUser, getCompanyRatingSummary } from '@/lib/supabase/queries'
import { createReview, updateReview, deleteReview } from '@/lib/supabase/mutations'

const STALE_TIME = 30_000

export function useCompanyReviews(companyId: string) {
  return useQuery({
    queryKey: ['reviews', companyId],
    queryFn: () => getReviewsForCompany(companyId),
    staleTime: STALE_TIME,
    enabled: Boolean(companyId),
  })
}

/** null (not an error) whenever the signed-in user hasn't reviewed this company yet, or nobody's signed in. */
export function useMyReview(companyId: string) {
  const { user, isConfigured } = useAuth()
  return useQuery({
    queryKey: ['myReview', companyId, user?.id],
    queryFn: () => getMyReviewForCompany(companyId, user!.id),
    enabled: isConfigured && Boolean(user) && Boolean(companyId),
  })
}

export function useCompanyRatingSummary(companyId: string) {
  return useQuery({
    queryKey: ['ratingSummary', companyId],
    queryFn: () => getCompanyRatingSummary(companyId),
    staleTime: STALE_TIME,
    enabled: Boolean(companyId),
  })
}

/** Every review the signed-in user has written, across every company — powers /saved's "Your reviews" section. */
export function useMyReviews() {
  const { user, isConfigured } = useAuth()
  return useQuery({
    queryKey: ['myReviews', user?.id],
    queryFn: () => getReviewsByUser(user!.id),
    staleTime: STALE_TIME,
    enabled: isConfigured && Boolean(user),
  })
}

/** Every review mutation invalidates the same query families — centralized here so create/edit/delete can't drift out of sync with each other. */
function useInvalidateReviewQueries() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return (companyId: string) => {
    queryClient.invalidateQueries({ queryKey: ['reviews', companyId] })
    queryClient.invalidateQueries({ queryKey: ['myReview', companyId] })
    queryClient.invalidateQueries({ queryKey: ['ratingSummary', companyId] })
    // Broad discovery-surface cache (search, leaderboards) — one company's
    // new review shouldn't require a hard refresh to show up there too.
    queryClient.invalidateQueries({ queryKey: ['ratingSummaries'] })
    queryClient.invalidateQueries({ queryKey: ['myReviews', user?.id] })
    // The public profile's paginated review list (Phase 29) — same reviews, different surface/query shape.
    queryClient.invalidateQueries({ queryKey: ['userReviews', user?.id] })
  }
}

export function useCreateReview() {
  const invalidate = useInvalidateReviewQueries()
  return useMutation({
    mutationFn: createReview,
    onSuccess: (review) => invalidate(review.companyId),
  })
}

export function useUpdateReview() {
  const invalidate = useInvalidateReviewQueries()
  return useMutation({
    mutationFn: ({ reviewId, ...input }: { reviewId: string; rating: number; title: string; body: string }) =>
      updateReview(reviewId, input),
    onSuccess: (review) => invalidate(review.companyId),
  })
}

export function useDeleteReview() {
  const invalidate = useInvalidateReviewQueries()
  return useMutation({
    // companyId is only needed client-side, to know which caches to
    // invalidate after the row is gone — deleteReview() itself only needs
    // the review's id.
    mutationFn: ({ reviewId }: { reviewId: string; companyId: string }) => deleteReview(reviewId),
    onSuccess: (_result, variables) => invalidate(variables.companyId),
  })
}
