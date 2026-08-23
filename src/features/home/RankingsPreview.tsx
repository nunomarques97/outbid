import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { useCategories, useAllCompanies, usePlacements, useActiveBids, useAllCompanyRatingSummaries } from '@/lib/supabase/hooks'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { getCategoryRanking, getTopCategoriesByBidTotal, CATEGORY_SPONSORED_SLOTS } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { VerifiedBadge } from '@/components/shared/VerifiedBadge'
import { CompanyRatingInline } from '@/features/reviews/CompanyRatingInline'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

export function RankingsPreview() {
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  // Supplementary, same as every other discovery surface — not part of the
  // loading/error gate below.
  const ratingSummariesQuery = useAllCompanyRatingSummaries()

  if (categoriesQuery.isLoading || companiesQuery.isLoading || placementsQuery.isLoading || bidsQuery.isLoading) {
    return <LoadingState label="Loading rankings…" />
  }
  if (categoriesQuery.isError || companiesQuery.isError || placementsQuery.isError || bidsQuery.isError) {
    return <ErrorState message="Couldn't load category rankings." />
  }

  const allCategories = (categoriesQuery.data ?? []).filter((c) => !c.isArchived)
  const companies = companiesQuery.data ?? []
  const bids = bidsQuery.data ?? []
  const globalPlacement = getGlobalPlacement(placementsQuery.data ?? [])
  if (allCategories.length === 0) return null

  // The three categories with the most active commercial interest (sum of
  // eligible companies' global bids) lead the homepage — not every
  // category equally. When nothing has an active bid yet (a fresh
  // marketplace), fall back to the first three so the section still shows
  // real community rankings instead of going empty.
  const topByBids = globalPlacement
    ? getTopCategoriesByBidTotal(companies, bids, globalPlacement.id, allCategories, 3)
    : []
  const categories = topByBids.length > 0 ? topByBids.map((t) => t.category) : allCategories.slice(0, 3)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Top rankings by category</h2>
        <Link to="/categories" className="text-sm font-semibold text-brand hover:underline">
          Browse all categories →
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {categories.map((category) => {
          const Icon = (Icons[category.icon as keyof typeof Icons] ?? Icons.Sparkles) as Icons.LucideIcon
          const { sponsored, organic } = globalPlacement
            ? getCategoryRanking(companies, bids, globalPlacement.id, category.id, CATEGORY_SPONSORED_SLOTS)
            : { sponsored: [], organic: [] }
          const topSponsoredCompany = sponsored[0] ? companies.find((c) => c.id === sponsored[0].companyId) : undefined
          const topOrganic = organic.slice(0, 2)

          return (
            <div
              key={category.id}
              className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand/30"
            >
              <Link
                to={`/categories/${category.slug}`}
                className="group mb-4 flex items-center gap-2 -m-1 rounded-lg p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Icon className="h-4 w-4 text-fg-muted" />
                <p className="font-semibold text-fg group-hover:text-brand">{category.name}</p>
                <Icons.ChevronRight className="ml-auto h-4 w-4 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <div className="flex flex-col gap-2">
                {topSponsoredCompany && (
                  <Link
                    to={`/companies/${topSponsoredCompany.slug}`}
                    className="group flex items-center gap-2.5 rounded-lg border border-sponsored/25 bg-surface-raised px-3 py-2 shadow-glow-gold transition-colors hover:border-sponsored/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <CompanyAvatar initials={topSponsoredCompany.initials} color={topSponsoredCompany.logoColor} logoUrl={topSponsoredCompany.logoUrl} size="sm" />
                    <span className="flex-1 truncate text-sm text-fg group-hover:underline">{topSponsoredCompany.name}</span>
                    {topSponsoredCompany.isVerified && <VerifiedBadge size="sm" />}
                    <CompanyRatingInline summary={ratingSummariesQuery.data?.get(topSponsoredCompany.id)} className="shrink-0" />
                    <SponsoredBadge size="sm" />
                  </Link>
                )}
                {topOrganic.map(({ company }, i) => (
                  <Link
                    key={company.id}
                    to={`/companies/${company.slug}`}
                    className="group flex items-center gap-2.5 rounded-lg px-3 py-1 transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <span className="font-numeral w-3 text-center text-xs text-organic">{i + 1}</span>
                    <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="sm" />
                    <span className="flex-1 truncate text-sm text-fg-muted group-hover:text-fg">{company.name}</span>
                    {company.isVerified && <VerifiedBadge size="sm" />}
                    <CompanyRatingInline summary={ratingSummariesQuery.data?.get(company.id)} className="shrink-0" />
                  </Link>
                ))}
                {!topSponsoredCompany && topOrganic.length === 0 && (
                  <p className="px-3 py-1 text-sm text-fg-subtle">No companies here yet.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
