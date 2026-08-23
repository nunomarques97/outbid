import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { useCategories, useAllCompanies, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { getTopBidders, splitTopBiddersForHomepage, type TopBidderEntry } from '@/lib/ranking'
import type { Category } from '@/mocks/types'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { VerifiedBadge } from '@/components/shared/VerifiedBadge'
import { CompanyExternalLinkButton } from '@/components/shared/CompanyExternalLinkButton'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCurrency, cn } from '@/lib/utils'

const HOMEPAGE_PRIMARY_COUNT = 5
const HOMEPAGE_MORE_COUNT = 5

/**
 * A different concept from RankingsPreview (community votes) and
 * DealsSection (advertiser-created deals): who's currently holding the
 * highest active sponsored bid, one row per company (see getTopBidders —
 * a company has exactly one bid no matter how many categories it's in).
 *
 * Two tiers rather than one short list, so a smaller advertiser sitting
 * at #6–#10 is still discoverable without leaving the homepage: the top 5
 * lead prominently, the next 5 sit in a "More bidders" horizontal
 * carousel beneath them. The homepage never paginates further than that —
 * /top-bidders is the real full list.
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
  const allEntries = globalPlacement ? getTopBidders(companies, bidsQuery.data ?? [], globalPlacement.id) : []
  const { primary, more } = splitTopBiddersForHomepage(allEntries, HOMEPAGE_PRIMARY_COUNT, HOMEPAGE_MORE_COUNT)

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-sponsored" />
          <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Top bidders</h2>
        </div>
        <Link to="/top-bidders" className="text-sm font-semibold text-brand hover:underline">
          View all bidders
        </Link>
      </div>

      {primary.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center">
          <p className="font-semibold text-fg">No sponsored bidders yet</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">
            Be the first company to compete for sponsored visibility.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {primary.map((entry, i) => (
              <BidderCard key={entry.company.id} entry={entry} rank={i + 1} categories={categories} />
            ))}
          </div>

          {more.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-muted">More bidders</h3>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {more.map((entry, i) => (
                  <BidderCard
                    key={entry.company.id}
                    entry={entry}
                    rank={HOMEPAGE_PRIMARY_COUNT + i + 1}
                    categories={categories}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function BidderCard({
  entry,
  rank,
  categories,
  compact,
}: {
  entry: TopBidderEntry
  rank: number
  categories: Category[]
  compact?: boolean
}) {
  const entryCategories = categories.filter((c) => entry.company.categoryIds.includes(c.id))

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-sponsored/25 bg-surface p-4 shadow-glow-gold',
        compact && 'w-56 shrink-0',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-numeral text-xs text-sponsored">#{rank}</span>
        <SponsoredBadge size="sm" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link to={`/companies/${entry.company.slug}`} className="flex min-w-0 items-center gap-2.5 hover:opacity-90">
          <CompanyAvatar initials={entry.company.initials} color={entry.company.logoColor} logoUrl={entry.company.logoUrl} size="sm" />
          <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-fg">
            <span className="truncate">{entry.company.name}</span>
            {entry.company.isVerified && <VerifiedBadge size="sm" />}
          </span>
        </Link>
        <CompanyExternalLinkButton website={entry.company.website} companyName={entry.company.name} className="h-7 w-7" />
      </div>
      {entryCategories.length > 0 && (
        <div className="-mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
          {entryCategories.map((c) => (
            <CategoryLink key={c.id} slug={c.slug} name={c.name} />
          ))}
        </div>
      )}
      <span className="font-numeral text-lg font-bold text-sponsored">{formatCurrency(entry.bid.amount)}</span>
    </div>
  )
}

function CategoryLink({ slug, name }: { slug: string; name: string }): ReactNode {
  return (
    <Link to={`/categories/${slug}`} className="truncate text-xs text-fg-subtle hover:text-fg hover:underline">
      {name}
    </Link>
  )
}
