import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { useCategories, useAllCompanies, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { getTopBidders } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCurrency } from '@/lib/utils'

const HOMEPAGE_TOP_BIDDER_COUNT = 4

/**
 * A different concept from RankingsPreview (community votes) and
 * DealsSection (advertiser-created deals): who's currently holding the
 * highest active sponsored bid, one row per company (see getTopBidders —
 * a company has exactly one bid no matter how many categories it's in).
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
  const globalPlacement = getGlobalPlacement(placementsQuery.data ?? [])
  const entries = globalPlacement
    ? getTopBidders(companies, bidsQuery.data ?? [], globalPlacement.id).slice(0, HOMEPAGE_TOP_BIDDER_COUNT)
    : []

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
            const entryCategories = categories.filter((c) => entry.company.categoryIds.includes(c.id))
            return (
              <div
                key={entry.company.id}
                className="flex flex-col gap-3 rounded-xl border border-sponsored/25 bg-surface p-4 shadow-glow-gold"
              >
                <div className="flex items-center justify-between">
                  <span className="font-numeral text-xs text-sponsored">#{i + 1}</span>
                  <SponsoredBadge size="sm" />
                </div>
                <Link to={`/companies/${entry.company.slug}`} className="flex items-center gap-2.5 hover:opacity-90">
                  <CompanyAvatar initials={entry.company.initials} color={entry.company.logoColor} logoUrl={entry.company.logoUrl} size="sm" />
                  <span className="truncate text-sm font-semibold text-fg">{entry.company.name}</span>
                </Link>
                {entryCategories.length > 0 && (
                  <div className="-mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                    {entryCategories.map((c) => (
                      <Link key={c.id} to={`/categories/${c.slug}`} className="truncate text-xs text-fg-subtle hover:text-fg hover:underline">
                        {c.name}
                      </Link>
                    ))}
                  </div>
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
