import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import type { Company } from '@/mocks/types'
import type { Review } from '@/lib/supabase/queries'
import { ReviewCard } from './ReviewCard'
import { ReviewForm } from './ReviewForm'
import { useDeleteReview } from './useReviews'

interface MyReviewsSectionProps {
  userId: string
  reviews: Review[]
  companies: Company[]
}

/**
 * The one place a customer can find every review they've written, across
 * every company, without having to remember and revisit each company's
 * profile individually. Reuses ReviewCard/ReviewForm exactly as the
 * company profile does — editing here and editing there are the same
 * flow, just entered from a different surface.
 */
export function MyReviewsSection({ userId, reviews, companies }: MyReviewsSectionProps) {
  const deleteMutation = useDeleteReview()
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => {
        const company = companies.find((c) => c.id === review.companyId)
        if (!company) return null

        if (editingId === review.id) {
          return (
            <ReviewForm
              key={review.id}
              companyId={company.id}
              userId={userId}
              existingReview={review}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          )
        }

        return (
          <div key={review.id} className="flex flex-col gap-1.5">
            <Link
              to={`/companies/${company.slug}`}
              className="text-xs font-semibold text-fg-muted hover:text-fg hover:underline"
            >
              {company.name}
            </Link>
            <ReviewCard
              review={review}
              isOwn
              onEdit={() => setEditingId(review.id)}
              onDelete={() => {
                deleteMutation.mutate(
                  { reviewId: review.id, companyId: review.companyId },
                  {
                    onSuccess: () => toast.success('Review deleted.'),
                    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete your review.'),
                  },
                )
              }}
              deleting={deleteMutation.isPending}
            />
          </div>
        )
      })}
    </div>
  )
}
