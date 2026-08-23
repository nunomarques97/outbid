import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Company } from '@/mocks/types'
import { useCategories, useAllCompanies, usePlacements, useActiveBids, useAllCompanyRatingSummaries } from '@/lib/supabase/hooks'
import { getGlobalPlacement, type CompanyRatingSummary } from '@/lib/supabase/queries'
import { getCategoryRanking, getCategoriesRankedByBidTotal, CATEGORY_SPONSORED_SLOTS } from '@/lib/ranking'
import { paginate } from '@/lib/pagination'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { VerifiedBadge } from '@/components/shared/VerifiedBadge'
import { CompanyExternalLinkButton } from '@/components/shared/CompanyExternalLinkButton'
import { CompanyRatingInline } from '@/features/reviews/CompanyRatingInline'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

// Ranks 1-2 stay static; ranks 3-7 (when present) auto-scroll in a looping
// vertical marquee instead of being cut off entirely — same "static head +
// looping tail" pattern as Hero's top-bidders panel (see Hero.tsx), just
// without its "Show all" toggle since this is a homepage preview, not the
// primary place to browse a category's full ranking (that's /categories/:slug).
const STATIC_ORGANIC_COUNT = 2
const MARQUEE_ORGANIC_MAX = 7
const CATEGORY_GROUP_SIZE = 3

export function RankingsPreview() {
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  // Supplementary, same as every other discovery surface — not part of the
  // loading/error gate below.
  const ratingSummariesQuery = useAllCompanyRatingSummaries()
  // Declared unconditionally, before the loading/error early returns below —
  // hooks can't follow a conditional return.
  const [page, setPage] = useState(0)

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

  // Every active category, always — ranked by commercial interest (sum of
  // eligible companies' global bids) highest first, but a category with
  // zero bids is still a real, browsable category and must never disappear
  // just because it currently has no sponsored interest. (Bug fixed here:
  // getTopCategoriesByBidTotal deliberately EXCLUDES zero-bid categories —
  // right for the SponsoredMechanicShowcase widget it was built for, wrong
  // here, where it silently collapsed this section down to only the 1-2
  // categories with an actual bid the moment the first bid was placed.
  // getCategoriesRankedByBidTotal orders the same way but keeps every
  // category, always returning exactly allCategories.length entries.)
  const orderedCategories = globalPlacement
    ? getCategoriesRankedByBidTotal(companies, bids, globalPlacement.id, allCategories).map((t) => t.category)
    : allCategories

  // Arrow state must always reflect the FULL category collection (13
  // active categories -> 5 pages), never the 3 currently rendered.
  const { pageItems: categories, totalPages, isFirstPage, isLastPage } = paginate(
    orderedCategories,
    page,
    CATEGORY_GROUP_SIZE,
  )

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Top rankings by category</h2>
        <div className="flex shrink-0 items-center gap-3">
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous categories"
                disabled={isFirstPage}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-fg-muted transition-colors hover:border-brand/30 hover:text-fg disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next categories"
                disabled={isLastPage}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-fg-muted transition-colors hover:border-brand/30 hover:text-fg disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <Link to="/categories" className="text-sm font-semibold text-brand hover:underline">
            Browse all categories →
          </Link>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {categories.map((category) => {
          const Icon = (Icons[category.icon as keyof typeof Icons] ?? Icons.Sparkles) as Icons.LucideIcon
          const { sponsored, organic } = globalPlacement
            ? getCategoryRanking(companies, bids, globalPlacement.id, category.id, CATEGORY_SPONSORED_SLOTS)
            : { sponsored: [], organic: [] }
          const topSponsoredCompany = sponsored[0] ? companies.find((c) => c.id === sponsored[0].companyId) : undefined
          const topOrganic = organic.slice(0, STATIC_ORGANIC_COUNT)
          const marqueeOrganic = organic.slice(STATIC_ORGANIC_COUNT, MARQUEE_ORGANIC_MAX)

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
                  <div className="flex items-center gap-1.5 rounded-lg border border-sponsored/25 bg-surface-raised pl-3 pr-1.5 py-2 shadow-glow-gold transition-colors hover:border-sponsored/50">
                    <Link
                      to={`/companies/${topSponsoredCompany.slug}`}
                      className="group flex min-w-0 flex-1 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <CompanyAvatar initials={topSponsoredCompany.initials} color={topSponsoredCompany.logoColor} logoUrl={topSponsoredCompany.logoUrl} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm text-fg group-hover:underline">{topSponsoredCompany.name}</span>
                      {topSponsoredCompany.isVerified && <VerifiedBadge size="sm" />}
                      <CompanyRatingInline summary={ratingSummariesQuery.data?.get(topSponsoredCompany.id)} className="shrink-0" />
                      <SponsoredBadge size="sm" />
                    </Link>
                    <CompanyExternalLinkButton
                      website={topSponsoredCompany.website}
                      companyName={topSponsoredCompany.name}
                      className="h-7 w-7"
                    />
                  </div>
                )}
                {topOrganic.map(({ company }, i) => (
                  <OrganicMiniRow
                    key={company.id}
                    rank={i + 1}
                    company={company}
                    ratingSummary={ratingSummariesQuery.data?.get(company.id)}
                  />
                ))}

                {marqueeOrganic.length > 0 && (
                  <div className="relative mt-0.5 h-[136px] overflow-hidden">
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-3 bg-gradient-to-b from-surface to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3 bg-gradient-to-t from-surface to-transparent" />
                    <motion.div
                      className="flex flex-col gap-2"
                      animate={{ y: ['0%', '-50%'] }}
                      transition={{ duration: marqueeOrganic.length * 2.2, repeat: Infinity, ease: 'linear' }}
                    >
                      {[...marqueeOrganic, ...marqueeOrganic].map((entry, i) => (
                        <OrganicMiniRow
                          key={`${entry.company.id}-${i}`}
                          rank={STATIC_ORGANIC_COUNT + (i % marqueeOrganic.length) + 1}
                          company={entry.company}
                          ratingSummary={ratingSummariesQuery.data?.get(entry.company.id)}
                        />
                      ))}
                    </motion.div>
                  </div>
                )}

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

function OrganicMiniRow({
  rank,
  company,
  ratingSummary,
}: {
  rank: number
  company: Company
  ratingSummary: CompanyRatingSummary | undefined
}) {
  return (
    <div className="group flex items-center gap-1 rounded-lg pl-3 pr-1 py-1 transition-colors hover:bg-surface-raised">
      <Link
        to={`/companies/${company.slug}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      >
        <span className="font-numeral w-3 shrink-0 text-center text-xs text-organic">{rank}</span>
        <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm text-fg-muted group-hover:text-fg">{company.name}</span>
        {company.isVerified && <VerifiedBadge size="sm" />}
        <CompanyRatingInline summary={ratingSummary} className="shrink-0" />
      </Link>
      <CompanyExternalLinkButton website={company.website} companyName={company.name} className="h-6 w-6" />
    </div>
  )
}
