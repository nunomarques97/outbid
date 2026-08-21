import { StarRating } from '@/components/shared/StarRating'
import { useCompanyRatingSummary } from './useReviews'
import { formatCompactNumber } from '@/lib/utils'

/**
 * A compact "4.7 ★ · 128 reviews" glance, meant to sit right under a
 * company's name — the same query as RatingSummary/CompanyReviewsSection
 * (['ratingSummary', companyId]), so this never triggers a second request.
 */
export function CompanyRatingBadge({ companyId }: { companyId: string }) {
  const { data: summary, isPending } = useCompanyRatingSummary(companyId)

  if (isPending) return null
  if (!summary || summary.reviewCount === 0) {
    return <p className="text-sm text-fg-subtle">No reviews yet</p>
  }

  return (
    <div className="flex items-center gap-2">
      <StarRating value={summary.averageRating} size="sm" />
      <span className="font-numeral text-sm text-fg">{summary.averageRating.toFixed(1)}</span>
      <span className="text-sm text-fg-muted">
        ({formatCompactNumber(summary.reviewCount)} review{summary.reviewCount === 1 ? '' : 's'})
      </span>
    </div>
  )
}
