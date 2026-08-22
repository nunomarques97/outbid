import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories, useAllCompanies, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { getTopBidders } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { Select } from '@/components/ui/select'
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/QueryStates'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { formatCurrency } from '@/lib/utils'

/**
 * Sponsored-bid ranking, cross-category — a different concept from
 * category discovery (community votes) and different again from Live
 * Deals (advertiser-created offers). One row per company (see
 * getTopBidders): a company with two categories still holds one bid, and
 * that same bid — same amount — is what the category filter shows for
 * either of its categories.
 */
export function TopBiddersPage() {
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  const [categoryId, setCategoryId] = useState('')
  useDocumentTitle('Top Bidders')

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

  const categories = (categoriesQuery.data ?? []).filter((c) => !c.isArchived)
  const companies = companiesQuery.data ?? []
  const globalPlacement = getGlobalPlacement(placementsQuery.data ?? [])
  const entries = globalPlacement
    ? getTopBidders(companies, bidsQuery.data ?? [], globalPlacement.id, categoryId || undefined)
    : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Top Bidders</h1>
      <p className="mt-2 max-w-xl text-fg-muted">
        Companies actively bidding for sponsored visibility, ranked by their current bid — separate
        from how the community ranks each category on its own. Each company holds one bid, no
        matter how many categories it belongs to.
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
            const entryCategories = categories.filter((c) => entry.company.categoryIds.includes(c.id))
            return (
              <div
                key={entry.company.id}
                className="flex items-center gap-3 rounded-xl border border-sponsored/25 bg-surface p-4 shadow-glow-gold"
              >
                <span className="font-numeral w-6 shrink-0 text-center text-lg text-sponsored">{i + 1}</span>
                <Link to={`/companies/${entry.company.slug}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90">
                  <CompanyAvatar initials={entry.company.initials} color={entry.company.logoColor} logoUrl={entry.company.logoUrl} />
                  <span className="truncate text-sm font-semibold text-fg">{entry.company.name}</span>
                </Link>
                {entryCategories.length > 0 && (
                  <div className="hidden shrink-0 flex-wrap items-center gap-x-2 sm:flex">
                    {entryCategories.map((c) => (
                      <Link key={c.id} to={`/categories/${c.slug}`} className="text-xs text-fg-subtle hover:text-fg hover:underline">
                        {c.name}
                      </Link>
                    ))}
                  </div>
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
