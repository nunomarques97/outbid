import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { useCategories, useAllCompanies, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getTopBidders } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCurrency } from '@/lib/utils'

const HOMEPAGE_TOP_BIDDER_COUNT = 4

/**
 * A different concept from RankingsPreview (community votes) and
 * DealsSection (advertiser-created deals): this is purely "who's currently
 * paying the most for sponsored visibility, across every category."
 */
export function TopBiddersSection() {
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()

  if (categoriesQuery.isLoading || companiesQuery.isLoading || placementsQuery.isLoading || bidsQuery.isLoading) {
    return <LoadingState label="Loading top bidders…" />
  }
  if (categoriesQuery.isError || companiesQuery.isError || placementsQuery.isError || bidsQuery.isError) {
    return <ErrorState message="Couldn't load top bidders." />
  }

  const categories = categoriesQuery.data ?? []
  const companies = companiesQuery.data ?? []
  const entries = getTopBidders(bidsQuery.data ?? [], placementsQuery.data ?? []).slice(0, HOMEPAGE_TOP_BIDDER_COUNT)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-sponsored" />
          <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Top bidders</h2>
        </div>
        <Link to="/top-bidders" className="text-sm font-semibold text-brand hover:underline">
          View all
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center">
          <p className="font-semibold text-fg">No sponsored bidders yet</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">
            Be the first company to compete for sponsored visibility.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {entries.map((entry, i) => {
            const company = companies.find((c) => c.id === entry.bid.companyId)
            const category = categories.find((c) => c.id === entry.categoryId)
            if (!company) return null
            return (
              <div
                key={`${entry.placement.id}-${entry.bid.companyId}`}
                className="flex flex-col gap-3 rounded-xl border border-sponsored/25 bg-surface p-4 shadow-glow-gold"
              >
                <div className="flex items-center justify-between">
                  <span className="font-numeral text-xs text-sponsored">#{i + 1}</span>
                  <SponsoredBadge size="sm" />
                </div>
                <Link to={`/companies/${company.slug}`} className="flex items-center gap-2.5 hover:opacity-90">
                  <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="sm" />
                  <span className="truncate text-sm font-semibold text-fg">{company.name}</span>
                </Link>
                {category && (
                  <Link to={`/categories/${category.slug}`} className="-mt-1.5 truncate text-xs text-fg-subtle hover:text-fg hover:underline">
                    {category.name}
                  </Link>
                )}
                <span className="font-numeral text-lg font-bold text-sponsored">{formatCurrency(entry.bid.amount)}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
