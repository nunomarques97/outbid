import { Trophy, TrendingDown } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface PositionCardProps {
  placementName: string
  rank: number
  totalSlots: number
  bidAmount: number
  isOutbid: boolean
}

export function PositionCard({ placementName, rank, totalSlots, bidAmount, isOutbid }: PositionCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-5',
        isOutbid ? 'border-danger/40' : 'border-sponsored/30 shadow-glow-gold',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-fg-muted">{placementName}</p>
        {isOutbid ? (
          <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold uppercase text-danger">
            <TrendingDown className="h-3 w-3" /> Outbid
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-sponsored/15 px-2 py-0.5 text-[11px] font-bold uppercase text-sponsored">
            <Trophy className="h-3 w-3" /> Leading
          </span>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">Position</p>
          <p className="font-numeral text-2xl text-fg">
            #{rank} <span className="text-sm text-fg-subtle">/ {totalSlots}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">Your bid</p>
          <p className={cn('font-numeral text-2xl', isOutbid ? 'text-danger' : 'text-sponsored')}>
            {formatCurrency(bidAmount)}
          </p>
        </div>
      </div>
    </div>
  )
}
