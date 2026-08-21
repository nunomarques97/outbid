import { formatCurrency } from '@/lib/utils'

const weeklySpend = [
  { label: 'Jul 07', amount: 1180 },
  { label: 'Jul 14', amount: 1340 },
  { label: 'Jul 21', amount: 1290 },
  { label: 'Jul 28', amount: 1510 },
  { label: 'Aug 04', amount: 1670 },
  { label: 'Aug 11', amount: 1820 },
  { label: 'Aug 18', amount: 1900 },
]

export function SpendOverviewChart() {
  const max = Math.max(...weeklySpend.map((w) => w.amount))

  return (
    <div className="flex items-end gap-2 sm:gap-3">
      {weeklySpend.map((week) => (
        <div key={week.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="font-numeral text-[11px] text-fg-muted sm:text-xs">{formatCurrency(week.amount)}</span>
          {/* Fixed-height track so the bar's percentage height has something definite to resolve against */}
          <div className="flex h-36 w-full items-end overflow-hidden rounded-t-md bg-surface-raised sm:h-44">
            <div
              className="w-full rounded-t-md bg-sponsored shadow-glow-gold transition-[height]"
              style={{ height: `${Math.max((week.amount / max) * 100, 6)}%` }}
            />
          </div>
          <span className="text-[10px] text-fg-subtle sm:text-[11px]">{week.label}</span>
        </div>
      ))}
    </div>
  )
}
