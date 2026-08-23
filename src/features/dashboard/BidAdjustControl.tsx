import { useState } from 'react'
import { BidAmountControl } from '@/features/dashboard/BidAmountControl'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { getBidSubmitDecision } from '@/lib/bidPayment'

interface BidAdjustControlProps {
  currentAmount: number
  leaderAmount: number
  onSubmit: (amount: number) => void
  submitting?: boolean
}

/**
 * Purely presentational — no bidding logic lives here beyond reusing
 * getBidSubmitDecision (the same pure helper DashboardPage uses) to decide
 * what to show and whether to allow submitting. The caller decides what
 * "submit" actually does (DashboardPage wires it to the real
 * place_bid/create-bid-payment paths via useDashboardBids). Repcastr bids
 * are one-way commitments — there is no lowering and no withdrawal, only
 * raising (paid) or staying put (free). The server independently
 * re-enforces this same rule — see place_bid()'s own rejection of a
 * lowered amount — this is UX only.
 */
export function BidAdjustControl({ currentAmount, leaderAmount, onSubmit, submitting }: BidAdjustControlProps) {
  // currentAmount, not 0: staying exactly here is the free "keep bid"
  // reaffirmation (see getBidSubmitDecision's free_same case) — anything
  // below it is a lowering attempt the server rejects outright, so the UI
  // never even offers it as a selectable value.
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
        <BidAmountControl value={value} onChange={setValue} min={currentAmount} disabled={submitting} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-fg-subtle">
        <span>Current leader: {formatCurrency(leaderAmount)}</span>
        <span className={willTakeLead ? 'text-sponsored' : 'text-danger'}>
          {willTakeLead ? 'Takes the lead' : 'Still behind'}
        </span>
      </div>
      {isLowering && (
        <p className="mt-2 text-xs text-danger">Bids can't be lowered. If you want a higher position, increase your bid.</p>
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
    </div>
  )
}
