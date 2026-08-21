import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompanies } from '@/lib/supabase/hooks'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { Button } from '@/components/ui/button'
import { RatingSummary } from './RatingSummary'
import { ReviewForm } from './ReviewForm'
import { ReviewCard } from './ReviewCard'
import { useCompanyRatingSummary, useCompanyReviews, useMyReview, useDeleteReview } from './useReviews'

interface CompanyReviewsSectionProps {
  companyId: string
  companyName: string
}

type Mode = 'idle' | 'writing' | 'editing'

/**
 * Owns the whole "reviews" area of a company profile: rating summary, the
 * write/edit/delete flow for the signed-in user's own review, and the list
 * of everyone else's. Deliberately self-contained (fetches its own data)
 * rather than threading review state through CompanyProfilePage, matching
 * how VoteButton/SaveButton/NotificationBell already work in this app.
 */
export function CompanyReviewsSection({ companyId, companyName }: CompanyReviewsSectionProps) {
  const { user, isConfigured } = useAuth()
  const myCompaniesQuery = useMyCompanies()
  const ratingSummaryQuery = useCompanyRatingSummary(companyId)
  const reviewsQuery = useCompanyReviews(companyId)
  const myReviewQuery = useMyReview(companyId)
  const deleteMutation = useDeleteReview()
  const [mode, setMode] = useState<Mode>('idle')

  if (reviewsQuery.isPending || ratingSummaryQuery.isPending) {
    return (
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">Reviews</h2>
        <LoadingState label="Loading reviews…" />
      </div>
    )
  }
  if (reviewsQuery.isError || ratingSummaryQuery.isError) {
    return (
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">Reviews</h2>
        <ErrorState message="Couldn't load reviews for this company." />
      </div>
    )
  }

  const managesThisCompany = Boolean(
    isConfigured && user && myCompaniesQuery.data?.some((c) => c.id === companyId),
  )
  const myReview = myReviewQuery.data ?? null
  // Already shown separately (with edit/delete controls) above the list —
  // no need to render it a second time as a plain read-only card.
  const otherReviews = reviewsQuery.data.filter((r) => r.userId !== user?.id)

  function handleDelete() {
    if (!myReview) return
    deleteMutation.mutate(
      { reviewId: myReview.id, companyId },
      {
        onSuccess: () => toast.success('Review deleted.'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete your review.'),
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-sm font-bold uppercase tracking-widest text-fg-muted">Reviews</h2>

      <RatingSummary summary={ratingSummaryQuery.data} companyName={companyName} />

      {mode === 'writing' || mode === 'editing' ? (
        <ReviewForm
          companyId={companyId}
          userId={user!.id}
          existingReview={mode === 'editing' ? myReview : null}
          onCancel={() => setMode('idle')}
          onSaved={() => setMode('idle')}
        />
      ) : !isConfigured || !user ? (
        <div className="rounded-xl border border-border bg-surface p-5 text-center">
          <p className="font-medium text-fg">Sign in to write a review</p>
          <p className="mt-1 text-sm text-fg-muted">Sign in from the header above to share your experience with {companyName}.</p>
        </div>
      ) : managesThisCompany ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-center text-sm text-fg-muted">
          You manage this company, so you can't leave a public review for it.
        </p>
      ) : myReview ? (
        <ReviewCard
          review={myReview}
          isOwn
          onEdit={() => setMode('editing')}
          onDelete={handleDelete}
          deleting={deleteMutation.isPending}
        />
      ) : (
        <Button type="button" onClick={() => setMode('writing')} className="self-start">
          Write a review
        </Button>
      )}

      {otherReviews.length > 0 && (
        <div className="flex flex-col gap-3">
          {otherReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  )
}
