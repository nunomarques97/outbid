import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface BidAdjustControlProps {
  currentAmount: number
  leaderAmount: number
  onSubmit: (amount: number) => void
  onWithdraw?: () => void
  submitting?: boolean
  withdrawing?: boolean
}

/**
 * Purely presentational — no bidding logic lives here. The caller decides
 * what "submit"/"withdraw" actually do (DashboardPage wires these to the
 * real place_bid/withdraw_bid RPCs via useDashboardBids).
 */
export function BidAdjustControl({
  currentAmount,
  leaderAmount,
  onSubmit,
  onWithdraw,
  submitting,
  withdrawing,
}: BidAdjustControlProps) {
  const max = Math.max(currentAmount, leaderAmount) * 1.6
  const [value, setValue] = useState(currentAmount)

  const willTakeLead = value > leaderAmount

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-fg">Adjust your bid</p>
        <p className="font-numeral text-lg text-sponsored">{formatCurrency(value)}</p>
      </div>
      <div className="mt-3">
        <Slider
          min={0}
          max={Math.ceil(max / 10) * 10}
          step={10}
          value={[value]}
          onValueChange={([v]) => setValue(v)}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-fg-subtle">
        <span>Current leader: {formatCurrency(leaderAmount)}</span>
        <span className={willTakeLead ? 'text-sponsored' : 'text-danger'}>
          {willTakeLead ? 'Takes the lead' : 'Still behind'}
        </span>
      </div>
      <Button
        size="sm"
        className="mt-3 w-full"
        variant={willTakeLead ? 'sponsored' : 'secondary'}
        disabled={submitting}
        onClick={() => onSubmit(value)}
      >
        {submitting ? 'Updating…' : 'Update bid'}
      </Button>
      {onWithdraw && (
        <button
          type="button"
          disabled={withdrawing}
          onClick={onWithdraw}
          className="mt-2 w-full text-center text-xs text-fg-subtle hover:text-danger disabled:opacity-50"
        >
          {withdrawing ? 'Withdrawing…' : 'Withdraw from this placement'}
        </button>
      )}
    </div>
  )
}
