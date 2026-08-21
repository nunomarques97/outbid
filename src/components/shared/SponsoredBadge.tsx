import { Badge } from '@/components/ui/badge'
import { SponsoredInfoTooltip } from './SponsoredInfoTooltip'
import { cn } from '@/lib/utils'

interface SponsoredBadgeProps {
  size?: 'sm' | 'md'
  withTooltip?: boolean
  className?: string
}

/**
 * The single canonical "Sponsored" label. Every paid placement in the app
 * must use this component — never a bespoke "Ad" pill or one-off badge —
 * so paid visibility is always visually identical and never confusable
 * with organic/community ranking.
 */
export function SponsoredBadge({ size = 'md', withTooltip = size === 'md', className }: SponsoredBadgeProps) {
  if (size === 'sm') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-sponsored px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-bg',
          className,
        )}
      >
        Sponsored
      </span>
    )
  }

  return (
    <Badge variant="sponsored" className={className}>
      Sponsored
      {withTooltip && <SponsoredInfoTooltip />}
    </Badge>
  )
}
