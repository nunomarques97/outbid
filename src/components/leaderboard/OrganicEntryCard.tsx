import { Link } from 'react-router-dom'
import type { Company } from '@/mocks/types'
import type { CompanyRatingSummary } from '@/lib/supabase/queries'
import { CompanyAvatar } from '@/components/ui/avatar'
import { VoteButton } from '@/components/shared/VoteButton'
import { SaveButton } from '@/components/shared/SaveButton'
import { CompanyRatingInline } from '@/features/reviews/CompanyRatingInline'

interface OrganicEntryCardProps {
  company: Company
  /** Omit outside a ranked list (e.g. the /saved page, where companies aren't ranked against each other) — the rank column is simply not rendered. */
  rank?: number
  ratingSummary?: CompanyRatingSummary
  /** Shown next to the rating when present — useful wherever a card isn't already scoped to a single category (e.g. /saved). */
  categoryNames?: string[]
}

export function OrganicEntryCard({ company, rank, ratingSummary, categoryNames }: OrganicEntryCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:border-organic/30">
      {rank !== undefined && (
        <span className="font-numeral w-6 shrink-0 text-center text-xl text-organic">{rank}</span>
      )}
      <Link to={`/companies/${company.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
        <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{company.name}</p>
          <p className="truncate text-sm text-fg-muted">{company.tagline}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CompanyRatingInline summary={ratingSummary} />
            {categoryNames && categoryNames.length > 0 && (
              <span className="text-xs text-fg-subtle">{categoryNames.join(' · ')}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <VoteButton companyId={company.id} companySlug={company.slug} baseVotes={company.organicVotes} size="sm" />
        <SaveButton companyId={company.id} size="sm" />
      </div>
    </div>
  )
}
