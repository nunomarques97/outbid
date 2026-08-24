import { Link } from 'react-router-dom'
import type { Company } from '@/mocks/types'
import type { CompanyRatingSummary } from '@/lib/supabase/queries'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { VerifiedBadge } from '@/components/shared/VerifiedBadge'
import { CompanyRatingInline } from '@/features/reviews/CompanyRatingInline'
import { formatCurrency, cn } from '@/lib/utils'

interface SponsoredEntryCardProps {
  company: Company
  rank: number
  bidAmount: number
  ratingSummary?: CompanyRatingSummary
}

export function SponsoredEntryCard({ company, rank, bidAmount, ratingSummary }: SponsoredEntryCardProps) {
  // Every sponsored row gets the same badge and border treatment regardless
  // of rank — rank position and sponsored status are separate signals, and
  // #2/#3/#4+ must never look like an ordinary organic row. #1 alone gets a
  // touch more visual weight (stronger border/glow) so the leader still
  // reads as the leader, without making every other sponsored row look
  // identical to organic or muting its own sponsored badge.
  const isLeader = rank === 1
  return (
    <Link
      to={`/companies/${company.slug}`}
      className={cn(
        'group flex items-center gap-4 rounded-xl border bg-surface p-4 transition-all hover:-translate-y-0.5',
        isLeader
          ? 'border-sponsored/50 shadow-glow-gold hover:border-sponsored/70'
          : 'border-sponsored/25 hover:border-sponsored/50 hover:shadow-glow-gold',
      )}
    >
      <span className="font-numeral w-6 shrink-0 text-center text-xl text-sponsored">{rank}</span>
      <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <SponsoredBadge />
          {company.isVerified && <VerifiedBadge size="sm" />}
        </div>
        <p className="mt-1 truncate font-semibold text-fg">{company.name}</p>
        <p className="truncate text-sm text-fg-muted">{company.tagline}</p>
        <CompanyRatingInline summary={ratingSummary} className="mt-1" />
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] uppercase tracking-wide text-fg-subtle">Winning bid</p>
        <p className="font-numeral text-xl text-sponsored">{formatCurrency(bidAmount)}</p>
      </div>
    </Link>
  )
}
