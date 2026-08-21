import { useActiveBids, useAllCompanies } from '@/lib/supabase/hooks'
import { getRankedBids } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCurrency, cn } from '@/lib/utils'

interface CompetitorBidTableProps {
  placementId: string
  myCompanyId: string
}

export function CompetitorBidTable({ placementId, myCompanyId }: CompetitorBidTableProps) {
  const bidsQuery = useActiveBids()
  const companiesQuery = useAllCompanies()

  if (bidsQuery.isLoading || companiesQuery.isLoading) return <LoadingState label="Loading competitors…" />
  if (bidsQuery.isError || companiesQuery.isError) return <ErrorState message="Couldn't load competitor bids." />

  // Same getRankedBids() every leaderboard on the site uses — rank/order
  // behavior here is identical to everywhere else, just fed live data.
  const ranked = getRankedBids(bidsQuery.data ?? [], placementId)
  const companies = companiesQuery.data ?? []

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="bg-surface-raised text-left text-fg-muted">
            <th className="px-4 py-2.5 font-medium">Rank</th>
            <th className="px-4 py-2.5 font-medium">Company</th>
            <th className="px-4 py-2.5 text-right font-medium">Current bid</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((bid) => {
            const company = companies.find((c) => c.id === bid.companyId)
            if (!company) return null
            const isMine = bid.companyId === myCompanyId
            return (
              <tr
                key={bid.id}
                className={cn('border-t border-border', isMine && 'bg-sponsored/10')}
              >
                <td className="font-numeral px-4 py-2.5 text-fg-muted">#{bid.rank}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="sm" />
                    <span className={cn('font-medium', isMine ? 'text-sponsored' : 'text-fg')}>
                      {company.name} {isMine && '(you)'}
                    </span>
                  </div>
                </td>
                <td className="font-numeral px-4 py-2.5 text-right text-fg">{formatCurrency(bid.amount)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
