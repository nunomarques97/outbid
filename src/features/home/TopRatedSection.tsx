import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import type { Company } from '@/mocks/types'
import type { CompanyRatingSummary } from '@/lib/supabase/queries'
import { useAllCompanies, useAllCompanyRatingSummaries } from '@/lib/supabase/hooks'
import { CompanyAvatar } from '@/components/ui/avatar'
import { StarRating } from '@/components/shared/StarRating'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCompactNumber } from '@/lib/utils'

const MIN_REVIEWS = 1
const LIMIT = 4

interface RatedCompany {
  company: Company
  summary: CompanyRatingSummary
}

/**
 * Real customer reputation as a discovery angle — driven entirely by
 * company_rating_summary, never fabricated. Renders nothing at all once no
 * company has a single review yet, rather than showing an empty or
 * fake-looking section.
 */
export function TopRatedSection() {
  const companiesQuery = useAllCompanies()
  const ratingSummariesQuery = useAllCompanyRatingSummaries()

  if (companiesQuery.isLoading || ratingSummariesQuery.isLoading) {
    return <LoadingState label="Loading top rated companies…" />
  }
  if (companiesQuery.isError || ratingSummariesQuery.isError) {
    return <ErrorState message="Couldn't load top rated companies." />
  }

  const companies = companiesQuery.data ?? []
  const summaries = ratingSummariesQuery.data ?? new Map<string, CompanyRatingSummary>()

  const topRated: RatedCompany[] = companies
    .map((company) => ({ company, summary: summaries.get(company.id) }))
    .filter((entry): entry is RatedCompany => Boolean(entry.summary) && entry.summary!.reviewCount >= MIN_REVIEWS)
    .sort((a, b) => b.summary.averageRating - a.summary.averageRating || b.summary.reviewCount - a.summary.reviewCount)
    .slice(0, LIMIT)

  if (topRated.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <Star className="h-5 w-5 text-organic" />
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Top rated by customers</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topRated.map(({ company, summary }) => (
          <Link
            key={company.id}
            to={`/companies/${company.slug}`}
            className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-organic/30"
          >
            <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="lg" />
            <p className="mt-3 truncate font-semibold text-fg">{company.name}</p>
            <p className="truncate text-sm text-fg-muted">{company.tagline}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <StarRating value={summary.averageRating} size="sm" />
              <span className="font-numeral text-sm text-fg">{summary.averageRating.toFixed(1)}</span>
              <span className="text-xs text-fg-subtle">({formatCompactNumber(summary.reviewCount)})</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
