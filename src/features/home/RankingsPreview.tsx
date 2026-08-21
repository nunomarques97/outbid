import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { useCategories, useAllCompanies, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getPlacementForCategory } from '@/lib/supabase/queries'
import { getSponsoredSlice, getOrganicRanking } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

export function RankingsPreview() {
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()

  if (categoriesQuery.isLoading || companiesQuery.isLoading || placementsQuery.isLoading || bidsQuery.isLoading) {
    return <LoadingState label="Loading rankings…" />
  }
  if (categoriesQuery.isError || companiesQuery.isError || placementsQuery.isError || bidsQuery.isError) {
    return <ErrorState message="Couldn't load category rankings." />
  }

  const categories = categoriesQuery.data ?? []
  const companies = companiesQuery.data ?? []
  const placements = placementsQuery.data ?? []
  const bids = bidsQuery.data ?? []
  if (categories.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Top rankings by category</h2>
        <Link to="/categories" className="text-sm font-semibold text-brand hover:underline">
          View all
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {categories.map((category) => {
          const Icon = (Icons[category.icon as keyof typeof Icons] ?? Icons.Sparkles) as Icons.LucideIcon
          const placement = getPlacementForCategory(placements, category.id)
          const categoryCompanies = companies.filter((c) => c.categoryIds.includes(category.id))
          const sponsored = placement ? getSponsoredSlice(bids, placement.id, placement.maxSponsoredSlots) : []
          const topSponsoredCompany = sponsored[0] ? companies.find((c) => c.id === sponsored[0].companyId) : undefined
          const topOrganic = getOrganicRanking(categoryCompanies, bids, placement).slice(0, 2)

          return (
            <Link
              key={category.id}
              to={`/categories/${category.slug}`}
              className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand/30"
            >
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-4 w-4 text-fg-muted" />
                <p className="font-semibold text-fg">{category.name}</p>
              </div>
              <div className="flex flex-col gap-2">
                {topSponsoredCompany && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-sponsored/25 bg-surface-raised px-3 py-2 shadow-glow-gold">
                    <CompanyAvatar initials={topSponsoredCompany.initials} color={topSponsoredCompany.logoColor} logoUrl={topSponsoredCompany.logoUrl} size="sm" />
                    <span className="flex-1 truncate text-sm text-fg">{topSponsoredCompany.name}</span>
                    <SponsoredBadge size="sm" />
                  </div>
                )}
                {topOrganic.map(({ company }, i) => (
                  <div key={company.id} className="flex items-center gap-2.5 px-3 py-1">
                    <span className="font-numeral w-3 text-center text-xs text-organic">{i + 1}</span>
                    <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="sm" />
                    <span className="flex-1 truncate text-sm text-fg-muted">{company.name}</span>
                  </div>
                ))}
                {!topSponsoredCompany && topOrganic.length === 0 && (
                  <p className="px-3 py-1 text-sm text-fg-subtle">No companies here yet.</p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
