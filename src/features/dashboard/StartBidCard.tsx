import { useState } from 'react'
import { Rocket } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

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
  // A helpful starting point, not a rule — the server has no minimum beyond
  // "greater than zero" (place_bid), the user can drag this anywhere. With
  // no leader, €1 is the true minimum spend to hold sponsored visibility —
  // default to it directly rather than an arbitrary higher suggestion.
  const suggestedStart = hasLeader ? leaderAmount + 1 : 1
  const [value, setValue] = useState(suggestedStart)
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
          <Slider
            min={0}
            max={Math.ceil(Math.max(suggestedStart, leaderAmount) * 1.6)}
            step={1}
            value={[value]}
            onValueChange={([v]) => setValue(v)}
          />
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
          <Rocket className="h-3.5 w-3.5" />
          {submitting ? 'Placing bid…' : 'Start bidding'}
        </Button>
      </div>
    </div>
  )
}
