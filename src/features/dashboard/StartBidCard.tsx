import { useState } from 'react'
import { Rocket, Loader2 } from 'lucide-react'
import { BidAmountControl } from '@/features/dashboard/BidAmountControl'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { getOpeningBidMinimum } from '@/lib/bidPayment'

interface StartBidCardProps {
  placementName: string
  leaderName: string | null
  leaderAmount: number
  activeBidderCount: number
  onSubmit: (amount: number) => void
  submitting?: boolean
}

/**
 * Purely presentational, same as BidAdjustControl — no bidding logic here.
 * The caller (DashboardPage) decides what "submit" does (the existing
 * usePlaceBid -> place_bid() RPC), this only collects an amount.
 */
export function StartBidCard({
  placementName,
  leaderName,
  leaderAmount,
  activeBidderCount,
  onSubmit,
  submitting,
}: StartBidCardProps) {
  const hasLeader = leaderAmount > 0
  // The floor this opening bid can be set to — €1 when nobody's bidding,
  // otherwise enough to take the lead outright (see getOpeningBidMinimum).
  // Not a server rule (place_bid only requires "> 0"), a product choice:
  // an opening bid is always framed as competing for the top spot, not a
  // deliberately-losing token amount.
  const minAmount = getOpeningBidMinimum(leaderAmount)
  const [value, setValue] = useState(minAmount)
  const willLead = value > leaderAmount

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-fg">{placementName}</h3>
        <span className="text-xs text-fg-subtle">
          {activeBidderCount} active {activeBidderCount === 1 ? 'bidder' : 'bidders'}
        </span>
      </div>
      <p className="mt-1 text-sm text-fg-muted">
        {hasLeader ? (
          <>
            Currently led by <span className="font-medium text-fg">{leaderName}</span> at{' '}
            <span className="font-numeral text-sponsored">{formatCurrency(leaderAmount)}</span>.
          </>
        ) : (
          'No one is sponsoring this placement yet — first bid takes the top spot.'
        )}
      </p>

      <div className="mt-4 rounded-lg border border-border bg-surface-raised p-4">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-fg">Your opening bid</p>
          <p className="font-numeral text-lg text-sponsored">{formatCurrency(value)}</p>
        </div>
        <div className="mt-3">
          <BidAmountControl value={value} onChange={setValue} min={minAmount} disabled={submitting} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-fg-subtle">
          <span>{hasLeader ? `Current leader: ${formatCurrency(leaderAmount)}` : 'No active bids yet'}</span>
          <span className={willLead ? 'text-sponsored' : 'text-danger'}>
            {willLead ? 'Takes the lead' : 'Still behind'}
          </span>
        </div>
        <Button
          size="sm"
          className="mt-3 w-full"
          variant="sponsored"
          disabled={submitting || value <= 0}
          onClick={() => onSubmit(value)}
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
          {submitting ? 'Placing bid…' : 'Start bidding'}
        </Button>
      </div>
    </div>
  )
}
