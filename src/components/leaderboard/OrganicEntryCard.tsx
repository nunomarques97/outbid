import { Link } from 'react-router-dom'
import type { Company } from '@/mocks/types'
import type { CompanyRatingSummary } from '@/lib/supabase/queries'
import { CompanyAvatar } from '@/components/ui/avatar'
import { VoteButton } from '@/components/shared/VoteButton'
import { SaveButton } from '@/components/shared/SaveButton'
import { CompanyRatingInline } from '@/features/reviews/CompanyRatingInline'

interface OrganicEntryCardProps {
  company: Company
  rank: number
  ratingSummary?: CompanyRatingSummary
}

export function OrganicEntryCard({ company, rank, ratingSummary }: OrganicEntryCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:border-organic/30">
      <span className="font-numeral w-6 shrink-0 text-center text-xl text-organic">{rank}</span>
      <Link to={`/companies/${company.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
        <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{company.name}</p>
          <p className="truncate text-sm text-fg-muted">{company.tagline}</p>
          <CompanyRatingInline summary={ratingSummary} className="mt-1" />
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <VoteButton companyId={company.id} companySlug={company.slug} baseVotes={company.organicVotes} size="sm" />
        <SaveButton companyId={company.id} size="sm" />
      </div>
    </div>
  )
}
