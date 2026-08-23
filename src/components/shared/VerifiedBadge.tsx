import { BadgeCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  size?: 'sm' | 'md'
  className?: string
}

/**
 * The single canonical "Verified" label — identity/representation only,
 * never a quality or endorsement claim, and never a substitute for
 * SponsoredBadge (paying for placement never implies verification, and
 * vice versa; a company can carry both, neither, or just one). Every
 * verified-company surface must use this component so the badge always
 * looks identical and is never confusable with Sponsored's gold styling.
 */
export function VerifiedBadge({ size = 'md', className }: VerifiedBadgeProps) {
  if (size === 'sm') {
    return (
      <span
        title="Repcastr has verified this company's identity/representation"
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success',
          className,
        )}
      >
        <BadgeCheck className="h-2.5 w-2.5" aria-hidden="true" />
        Verified
      </span>
    )
  }

  return (
    <Badge
      variant="success"
      className={className}
      title="Repcastr has verified this company's identity/representation"
    >
      <BadgeCheck className="h-3 w-3" aria-hidden="true" />
      Verified
    </Badge>
  )
}
