import { Link } from 'react-router-dom'
import type { Company } from '@/mocks/types'
import { CompanyAvatar } from '@/components/ui/avatar'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { formatCurrency, cn } from '@/lib/utils'

interface SponsoredEntryCardProps {
  company: Company
  rank: number
  bidAmount: number
}

export function SponsoredEntryCard({ company, rank, bidAmount }: SponsoredEntryCardProps) {
  return (
    <Link
      to={`/companies/${company.slug}`}
      className={cn(
        'group flex items-center gap-4 rounded-xl border border-sponsored/30 bg-surface p-4 transition-all',
        'shadow-glow-gold hover:border-sponsored/60 hover:-translate-y-0.5',
      )}
    >
      <span className="font-numeral w-6 shrink-0 text-center text-xl text-sponsored">{rank}</span>
      <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <SponsoredBadge />
        </div>
        <p className="mt-1 truncate font-semibold text-fg">{company.name}</p>
        <p className="truncate text-sm text-fg-muted">{company.tagline}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] uppercase tracking-wide text-fg-subtle">Winning bid</p>
        <p className="font-numeral text-xl text-sponsored">{formatCurrency(bidAmount)}</p>
      </div>
    </Link>
  )
}
