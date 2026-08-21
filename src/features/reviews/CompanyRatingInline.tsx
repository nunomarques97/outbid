import type { CompanyRatingSummary } from '@/lib/supabase/queries'
import { StarRating } from '@/components/shared/StarRating'
import { formatCompactNumber, cn } from '@/lib/utils'

/**
 * The compact "★ 4.7 (128)" readout for dense rows — search results,
 * leaderboard entries. Renders nothing while the summary hasn't loaded yet
 * or the company has zero reviews, so list rows stay clean instead of every
 * unreviewed company showing a "no reviews" caption; that messaging belongs
 * on the profile page (CompanyRatingBadge), where it's the point of the
 * section, not incidental to a list row.
 */
export function CompanyRatingInline({ summary, className }: { summary?: CompanyRatingSummary; className?: string }) {
  if (!summary || summary.reviewCount === 0) return null

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <StarRating value={summary.averageRating} size="sm" />
      <span className="text-xs text-fg-muted">
        {summary.averageRating.toFixed(1)} ({formatCompactNumber(summary.reviewCount)})
      </span>
    </div>
  )
}
