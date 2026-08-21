import type { CompanyRatingSummary } from '@/lib/supabase/queries'
import { StarRating } from '@/components/shared/StarRating'
import { formatCompactNumber, cn } from '@/lib/utils'

interface RatingSummaryProps {
  summary: CompanyRatingSummary
  companyName: string
}

/**
 * The reputation "hero" block — average rating, total count, and the 5→1
 * star distribution, all derived from company_rating_summary (the one
 * place this math happens; see supabase/migrations/*_reviews.sql). Never
 * computed client-side from a review list, so it stays correct even before
 * the full review list has loaded.
 */
export function RatingSummary({ summary, companyName }: RatingSummaryProps) {
  if (summary.reviewCount === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <StarRating value={0} size="lg" className="justify-center" />
        <p className="mt-3 font-semibold text-fg">No reviews yet</p>
        <p className="mt-1 text-sm text-fg-muted">Be the first to share what it's like working with {companyName}.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
      <div className="flex shrink-0 flex-col items-center gap-1 sm:border-r sm:border-border sm:pr-6">
        <p className="font-numeral text-4xl text-fg">{summary.averageRating.toFixed(1)}</p>
        <StarRating value={summary.averageRating} size="md" />
        <p className="text-xs text-fg-muted">
          {formatCompactNumber(summary.reviewCount)} review{summary.reviewCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary.countsByStar[star]
          const pct = summary.reviewCount > 0 ? (count / summary.reviewCount) * 100 : 0
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 shrink-0 text-right text-fg-muted">{star}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
                <div
                  className={cn('h-full rounded-full bg-organic transition-all', pct === 0 && 'w-0')}
                  style={pct > 0 ? { width: `${pct}%` } : undefined}
                />
              </div>
              <span className="w-6 shrink-0 text-fg-subtle">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
