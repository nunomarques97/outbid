import type { ReactNode } from 'react'
import { useCompaniesByCategory, usePlacements, useActiveBids, useAllCompanyRatingSummaries } from '@/lib/supabase/hooks'
import { getPlacementForCategory } from '@/lib/supabase/queries'
import { getSponsoredSlice, getOrganicRanking } from '@/lib/ranking'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { SponsoredEntryCard } from './SponsoredEntryCard'
import { OrganicEntryCard } from './OrganicEntryCard'

interface LeaderboardListProps {
  categoryId: string
  organicLimit?: number
}

export function LeaderboardList({ categoryId, organicLimit }: LeaderboardListProps) {
  const companiesQuery = useCompaniesByCategory(categoryId)
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  const ratingSummariesQuery = useAllCompanyRatingSummaries()

  if (companiesQuery.isLoading || placementsQuery.isLoading || bidsQuery.isLoading) {
    return <LoadingState label="Loading rankings…" />
  }
  if (companiesQuery.isError || placementsQuery.isError || bidsQuery.isError) {
    return <ErrorState message="Couldn't load this category's rankings." />
  }

  const companies = companiesQuery.data ?? []
  const bids = bidsQuery.data ?? []
  const placement = getPlacementForCategory(placementsQuery.data ?? [], categoryId)

  const sponsored = placement ? getSponsoredSlice(bids, placement.id, placement.maxSponsoredSlots) : []
  const organic = getOrganicRanking(companies, bids, placement).slice(0, organicLimit)

  return (
    <div className="flex flex-col gap-6">
      {sponsored.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel color="sponsored">Sponsored</SectionLabel>
          <div className="flex flex-col gap-3">
            {sponsored.map((bid) => {
              const company = companies.find((c) => c.id === bid.companyId)
              if (!company) return null
              return (
                <SponsoredEntryCard
                  key={bid.id}
                  company={company}
                  rank={bid.rank}
                  bidAmount={bid.amount}
                  ratingSummary={ratingSummariesQuery.data?.get(company.id)}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SectionLabel color="organic">Community ranked</SectionLabel>
        {organic.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface/60 p-4 text-sm text-fg-muted">
            No community-ranked companies here yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {organic.map((entry, i) => (
              <OrganicEntryCard
                key={entry.company.id}
                company={entry.company}
                rank={i + 1}
                ratingSummary={ratingSummariesQuery.data?.get(entry.company.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children, color }: { children: ReactNode; color: 'sponsored' | 'organic' }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color === 'sponsored' ? 'bg-sponsored' : 'bg-organic'}`} />
      <h3 className="text-xs font-bold uppercase tracking-widest text-fg-muted">{children}</h3>
    </div>
  )
}
