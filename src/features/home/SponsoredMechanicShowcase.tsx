import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useCategories, useAllCompanies, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getPlacementForCategory } from '@/lib/supabase/queries'
import { getSponsoredSlice } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCurrency } from '@/lib/utils'

const SHOWCASE_CATEGORY_SLUG = 'software'

export function SponsoredMechanicShowcase() {
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()

  if (categoriesQuery.isLoading || companiesQuery.isLoading || placementsQuery.isLoading || bidsQuery.isLoading) {
    return <LoadingState label="Loading…" />
  }
  if (categoriesQuery.isError || companiesQuery.isError || placementsQuery.isError || bidsQuery.isError) {
    return <ErrorState message="Couldn't load the sponsored leaderboard example." />
  }

  const category = (categoriesQuery.data ?? []).find((c) => c.slug === SHOWCASE_CATEGORY_SLUG)
  const placement = category ? getPlacementForCategory(placementsQuery.data ?? [], category.id) : null
  const ranked = placement ? getSponsoredSlice(bidsQuery.data ?? [], placement.id, 3) : []
  const companies = companiesQuery.data ?? []

  return (
    <section className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sponsored">How sponsored placement works</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Position is earned by bid — and it’s never hidden
            </h2>
            <p className="mt-4 text-fg-muted">
              Every category has a small number of sponsored spots. Companies bid openly in
              euros for them. The highest bidder takes the top position — and if a competitor
              bids higher tomorrow, they take it back.
            </p>
            <p className="mt-3 text-fg-muted">
              Nothing about this affects the <span className="text-organic">Community Ranked</span>{' '}
              list beneath it, which is driven entirely by votes from people like you.
            </p>
            {category && (
              <Link
                to={`/categories/${category.slug}`}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sponsored hover:underline"
              >
                See the live leaderboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="mb-4 text-sm font-semibold text-fg">{category ? `Best ${category.name}` : 'Sponsored leaderboard'}</p>
            {ranked.length === 0 ? (
              <p className="text-sm text-fg-muted">No sponsored bids on this category yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {ranked.map((bid) => {
                  const company = companies.find((c) => c.id === bid.companyId)
                  if (!company) return null
                  return (
                    <div
                      key={bid.id}
                      className="flex items-center gap-3 rounded-lg border border-sponsored/25 bg-surface-raised p-3 shadow-glow-gold"
                    >
                      <span className="font-numeral w-4 text-center text-sponsored">{bid.rank}</span>
                      <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="sm" />
                      <span className="flex-1 truncate text-sm font-medium text-fg">{company.name}</span>
                      <SponsoredBadge size="sm" />
                      <span className="font-numeral w-16 shrink-0 text-right text-sm text-sponsored">
                        {formatCurrency(bid.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
