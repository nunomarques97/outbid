import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories, useAllCompanies, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getTopBidders } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { Select } from '@/components/ui/select'
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/QueryStates'
import { formatCurrency } from '@/lib/utils'

/**
 * Sponsored-bid ranking, cross-category — a different concept from
 * category discovery (community votes) and different again from Live
 * Deals (advertiser-created offers). See getTopBidders: one row per
 * active bid, not per company, since a company can hold different bids
 * in different categories.
 */
export function TopBiddersPage() {
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  const [categoryId, setCategoryId] = useState('')

  const loading =
    categoriesQuery.isLoading || companiesQuery.isLoading || placementsQuery.isLoading || bidsQuery.isLoading
  const errored =
    categoriesQuery.isError || companiesQuery.isError || placementsQuery.isError || bidsQuery.isError

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Top Bidders</h1>
        <LoadingState label="Loading top bidders…" />
      </div>
    )
  }
  if (errored) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Top Bidders</h1>
        <ErrorState message="Couldn't load top bidders." />
      </div>
    )
  }

  const categories = categoriesQuery.data ?? []
  const companies = companiesQuery.data ?? []
  const entries = getTopBidders(bidsQuery.data ?? [], placementsQuery.data ?? [], categoryId || undefined)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Top Bidders</h1>
      <p className="mt-2 max-w-xl text-fg-muted">
        Companies actively bidding for sponsored visibility, ranked by their current bid — separate
        from how the community ranks each category on its own.
      </p>

      <div className="mt-6 max-w-xs">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {entries.length === 0 ? (
        <div className="mt-8">
          <EmptyState message="No active sponsored bids right now — be the first company to compete for visibility." />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {entries.map((entry, i) => {
            const company = companies.find((c) => c.id === entry.bid.companyId)
            const category = categories.find((c) => c.id === entry.categoryId)
            if (!company) return null
            return (
              <div
                key={`${entry.placement.id}-${entry.bid.companyId}`}
                className="flex items-center gap-3 rounded-xl border border-sponsored/25 bg-surface p-4 shadow-glow-gold"
              >
                <span className="font-numeral w-6 shrink-0 text-center text-lg text-sponsored">{i + 1}</span>
                <Link to={`/companies/${company.slug}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
                  <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} />
                  <span className="truncate text-sm font-semibold text-fg">{company.name}</span>
                </Link>
                {category && (
                  <Link
                    to={`/categories/${category.slug}`}
                    className="hidden shrink-0 text-xs text-fg-subtle hover:text-fg hover:underline sm:inline"
                  >
                    {category.name}
                  </Link>
                )}
                <SponsoredBadge size="sm" />
                <span className="font-numeral w-20 shrink-0 text-right text-sm font-semibold text-sponsored">
                  {formatCurrency(entry.bid.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
