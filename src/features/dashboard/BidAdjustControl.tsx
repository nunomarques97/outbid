import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { getBidSubmitDecision } from '@/lib/bidPayment'

interface BidAdjustControlProps {
  currentAmount: number
  leaderAmount: number
  onSubmit: (amount: number) => void
  onWithdraw?: () => void
  submitting?: boolean
  withdrawing?: boolean
}

/**
 * Purely presentational — no bidding logic lives here beyond reusing
 * getBidSubmitDecision (the same pure helper DashboardPage uses) to decide
 * what to show and whether to allow submitting. The caller decides what
 * "submit"/"withdraw" actually do (DashboardPage wires these to the real
 * place_bid/create-bid-payment/withdraw_bid paths via useDashboardBids).
 * The server independently re-enforces this same rule — see
 * place_bid()'s own rejection of a lowered amount — this is UX only.
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
  const decision = getBidSubmitDecision({ targetAmount: value, currentActiveAmount: currentAmount })
  const isLowering = decision.action === 'rejected_lowering'

  const buttonLabel = submitting
    ? 'Updating…'
    : decision.action === 'paid_raise'
      ? `Raise bid — pay ${formatCurrency(decision.chargeAmount)}`
      : decision.action === 'rejected_lowering'
        ? "Bids can't be lowered"
        : 'Keep bid'

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
      {isLowering && (
        <p className="mt-2 text-xs text-danger">
          Bids can't be lowered — withdraw below if you want to reduce or leave this placement.
        </p>
      )}
      <Button
        size="sm"
        className="mt-3 w-full"
        variant={willTakeLead ? 'sponsored' : 'secondary'}
        disabled={submitting || isLowering}
        onClick={() => onSubmit(value)}
      >
        {buttonLabel}
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
