import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAllCompanies, useUserReviews } from '@/lib/supabase/hooks'
import { useDeleteReview } from '@/features/reviews/useReviews'
import { ReviewCard } from '@/features/reviews/ReviewCard'
import { ReviewForm } from '@/features/reviews/ReviewForm'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { Button } from '@/components/ui/button'

interface ProfileReviewsSectionProps {
  userId: string
  username: string
  /** Already resolved by the parent (this page's own subject profile) — no need for a second batched lookup for a single, already-known user. */
  avatarUrl: string | null
  isOwn: boolean
}

/**
 * The bottom half of a public profile — newest-first, "load more" paged
 * (useUserReviews is a TanStack infinite query, never fetches the whole
 * history at once). Reuses ReviewCard/ReviewForm exactly as the company
 * profile and /saved do; editing here is the same flow, just entered from
 * a different surface. Read-only when viewing someone else's profile.
 */
export function ProfileReviewsSection({ userId, username, avatarUrl, isOwn }: ProfileReviewsSectionProps) {
  const reviewsQuery = useUserReviews(userId)
  const companiesQuery = useAllCompanies()
  const deleteMutation = useDeleteReview()
  const [editingId, setEditingId] = useState<string | null>(null)

  if (reviewsQuery.isPending || companiesQuery.isPending) return <LoadingState label="Loading reviews…" />
  if (reviewsQuery.isError || companiesQuery.isError) return <ErrorState message="Couldn't load reviews." />

  const reviews = reviewsQuery.data.pages.flatMap((page) => page.reviews)
  const companies = companiesQuery.data ?? []

  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-fg-muted">
        {isOwn ? "You haven't written any reviews yet." : "No reviews yet."}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => {
        const company = companies.find((c) => c.id === review.companyId)

        if (isOwn && editingId === review.id) {
          return (
            <ReviewForm
              key={review.id}
              companyId={review.companyId}
              userId={userId}
              existingReview={review}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          )
        }

        return (
          <div key={review.id} className="flex flex-col gap-1.5">
            {company && (
              <Link to={`/companies/${company.slug}`} className="text-xs font-semibold text-fg-muted hover:text-fg hover:underline">
                {company.name}
              </Link>
            )}
            <ReviewCard
              review={review}
              isOwn={isOwn}
              authorUsername={username}
              authorAvatarUrl={avatarUrl}
              onEdit={isOwn ? () => setEditingId(review.id) : undefined}
              onDelete={
                isOwn
                  ? () =>
                      deleteMutation.mutate(
                        { reviewId: review.id, companyId: review.companyId },
                        {
                          onSuccess: () => toast.success('Review deleted.'),
                          onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete your review.'),
                        },
                      )
                  : undefined
              }
              deleting={deleteMutation.isPending}
            />
          </div>
        )
      })}

      {reviewsQuery.hasNextPage && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => reviewsQuery.fetchNextPage()}
          disabled={reviewsQuery.isFetchingNextPage}
          className="self-center"
        >
          {reviewsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  )
}
