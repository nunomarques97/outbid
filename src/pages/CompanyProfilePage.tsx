import { useParams, Link, Navigate } from 'react-router-dom'
import { Globe, Calendar, ArrowRight, Swords, Trophy } from 'lucide-react'
import type { Company } from '@/mocks/types'
import {
  useCompany,
  useCategories,
  usePlacements,
  useActiveBids,
  useBattles,
  useDeals,
  useAllCompanies,
  useCompaniesByCategory,
  useAllCompanyRatingSummaries,
} from '@/lib/supabase/hooks'
import { getRankedBids, getCategoryRanking, CATEGORY_SPONSORED_SLOTS } from '@/lib/ranking'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { CompanyAvatar } from '@/components/ui/avatar'
import { VoteButton } from '@/components/shared/VoteButton'
import { SaveButton } from '@/components/shared/SaveButton'
import { SponsoredBadge } from '@/components/shared/SponsoredBadge'
import { VerifiedBadge } from '@/components/shared/VerifiedBadge'
import { DealCard } from '@/components/shared/DealCard'
import { CompanyWebsiteLink } from '@/components/shared/CompanyWebsiteLink'
import { OrganicEntryCard } from '@/components/leaderboard/OrganicEntryCard'
import { CompanyRatingBadge } from '@/features/reviews/CompanyRatingBadge'
import { CompanyReviewsSection } from '@/features/reviews/CompanyReviewsSection'
import { ReportButton } from '@/features/reports/ReportButton'
import { ClaimCompanyButton } from '@/features/claims/ClaimCompanyButton'
import { buttonVariants } from '@/components/ui/button'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { useSeo } from '@/lib/useSeo'
import { buildCompanyDescription } from '@/lib/seoContent'
import { formatCurrency, formatCompactNumber, cn } from '@/lib/utils'

export function CompanyProfilePage() {
  const { slug } = useParams()
  const companyQuery = useCompany(slug ?? '')
  useSeo({
    title: companyQuery.data?.name,
    description: companyQuery.data ? buildCompanyDescription(companyQuery.data) : undefined,
    canonicalPath: slug ? `/companies/${slug}` : undefined,
  })

  if (companyQuery.isLoading) return <LoadingState label="Loading company…" />
  if (companyQuery.isError) return <ErrorState message="Couldn't load this company." />
  if (!companyQuery.data) return <Navigate to="/categories" replace />

  return <CompanyProfileContent company={companyQuery.data} />
}

function CompanyProfileContent({ company }: { company: Company }) {
  const categoriesQuery = useCategories()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  const battlesQuery = useBattles()
  const dealsQuery = useDeals()
  const allCompaniesQuery = useAllCompanies()
  const primaryCategoryId = company.categoryIds[0]
  const primaryCategoryCompaniesQuery = useCompaniesByCategory(primaryCategoryId)
  // Supplementary, same as every other discovery surface — not part of the
  // loading/error gate below.
  const ratingSummariesQuery = useAllCompanyRatingSummaries()

  const loading =
    categoriesQuery.isLoading ||
    placementsQuery.isLoading ||
    bidsQuery.isLoading ||
    battlesQuery.isLoading ||
    dealsQuery.isLoading ||
    allCompaniesQuery.isLoading ||
    (Boolean(primaryCategoryId) && primaryCategoryCompaniesQuery.isLoading)
  const errored =
    categoriesQuery.isError ||
    placementsQuery.isError ||
    bidsQuery.isError ||
    battlesQuery.isError ||
    dealsQuery.isError ||
    allCompaniesQuery.isError ||
    (Boolean(primaryCategoryId) && primaryCategoryCompaniesQuery.isError)

  if (loading) return <LoadingState label="Loading company…" />
  if (errored) return <ErrorState message="Couldn't load this company's full profile." />

  const companyCategories = (categoriesQuery.data ?? []).filter((c) => company.categoryIds.includes(c.id))
  const placements = placementsQuery.data ?? []
  const bids = bidsQuery.data ?? []
  const allCompanies = allCompaniesQuery.data ?? []
  const globalPlacement = getGlobalPlacement(placements)

  // One company holds one global bid, but that single bid can make it
  // sponsored in more than one of its own (up to 2) categories — plus,
  // separately, homepage_featured/deal_spotlight are their own
  // independent placements a company can hold its own bid on.
  const categorySponsorships = globalPlacement
    ? companyCategories
        .map((cat) => {
          const { sponsored } = getCategoryRanking(allCompanies, bids, globalPlacement.id, cat.id, CATEGORY_SPONSORED_SLOTS)
          const entry = sponsored.find((b) => b.companyId === company.id)
          return entry ? { label: cat.name, rank: entry.rank, amount: entry.amount } : null
        })
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
    : []
  const otherSponsorships = placements
    .filter((p) => p.type === 'homepage_featured' || p.type === 'deal_spotlight')
    .map((p) => {
      const entry = getRankedBids(bids, p.id).find((b) => b.companyId === company.id)
      return entry ? { label: placementLabel(p.type), rank: entry.rank, amount: entry.amount } : null
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
  const sponsorships = [...categorySponsorships, ...otherSponsorships]

  const relatedBattles = (battlesQuery.data ?? []).filter(
    (b) => b.companyAId === company.id || b.companyBId === company.id,
  )
  const relatedDeals = (dealsQuery.data ?? []).filter((d) => d.companyId === company.id)
  const primaryCategory = (categoriesQuery.data ?? []).find((c) => c.id === primaryCategoryId)
  const relatedCompanies = (primaryCategoryCompaniesQuery.data ?? [])
    .filter((c) => c.id !== company.id)
    .slice(0, 3)

  const organicRank = (() => {
    if (!primaryCategoryId || !globalPlacement) return null
    const { organic } = getCategoryRanking(
      primaryCategoryCompaniesQuery.data ?? [],
      bids,
      globalPlacement.id,
      primaryCategoryId,
      CATEGORY_SPONSORED_SLOTS,
    )
    const index = organic.findIndex((entry) => entry.company.id === company.id)
    return { rank: index === -1 ? null : index, of: organic.length }
  })()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{company.name}</h1>
            {company.isVerified && <VerifiedBadge />}
            {sponsorships.length > 0 && <SponsoredBadge />}
          </div>
          <p className="mt-1 text-fg-muted">{company.tagline}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CompanyRatingBadge companyId={company.id} />
            {!company.isVerified && <ClaimCompanyButton companyId={company.id} companyName={company.name} />}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {companyCategories.map((c) => (
              <Link
                key={c.id}
                to={`/categories/${c.slug}`}
                className="rounded-full border border-border bg-surface-raised px-3 py-1 text-xs text-fg-muted transition-colors hover:border-brand/30 hover:text-fg"
              >
                {c.name}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <CompanyWebsiteLink website={company.website} />
            {relatedBattles[0] && (
              <Link
                to={`/battles/${relatedBattles[0].id}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Swords className="h-3.5 w-3.5" /> Compare
              </Link>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2">
            <VoteButton companySlug={company.slug} baseVotes={company.organicVotes} />
            <SaveButton companyId={company.id} />
          </div>
          <ReportButton targetType="company" targetId={company.id} withLabel />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Organic votes" value={formatCompactNumber(company.organicVotes)} icon={Trophy} />
        <Stat
          label="Community rank"
          value={organicRank && organicRank.rank !== null ? `#${organicRank.rank + 1} of ${organicRank.of}` : '—'}
        />
        <Stat label="Founded" value={String(company.foundedYear)} icon={Calendar} />
        <Stat label="Website" value={company.website} icon={Globe} />
      </div>

      <div className="mt-8">
        <CompanyReviewsSection companyId={company.id} companyName={company.name} />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-fg-muted">About</h2>
        <p className="leading-relaxed text-fg-muted">{company.description}</p>
        {company.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {company.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface-raised px-2.5 py-1 text-xs text-fg-muted">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {sponsorships.length > 0 && (
        <div className="mt-8 rounded-xl border border-sponsored/30 bg-surface p-5 shadow-glow-gold">
          <div className="mb-3 flex items-center gap-2">
            <SponsoredBadge withTooltip={false} />
            <span className="text-sm font-medium text-fg">Sponsored status</span>
          </div>
          <div className="flex flex-col gap-2">
            {sponsorships.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">
                  {s.label} — rank <span className="font-numeral text-sponsored">#{s.rank}</span>
                </span>
                <span className="font-numeral text-sponsored">{formatCurrency(s.amount)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-fg-subtle">
            This company currently holds a paid position here. Any competitor can outbid it at any time — paid
            placement never affects the community rank above.
          </p>
        </div>
      )}

      {relatedDeals.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">Deals from {company.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedDeals.map((d) => (
              <DealCard key={d.id} deal={d} company={company} />
            ))}
          </div>
        </div>
      )}

      {relatedBattles.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">Head-to-head</h2>
          <div className="flex flex-col gap-2">
            {relatedBattles.map((b) => {
              const opponentId = b.companyAId === company.id ? b.companyBId : b.companyAId
              const opponent = allCompanies.find((c) => c.id === opponentId)
              const iAmA = b.companyAId === company.id
              const myVotes = iAmA ? b.votesA : b.votesB
              const theirVotes = iAmA ? b.votesB : b.votesA
              const winning = myVotes >= theirVotes
              return (
                <Link
                  key={b.id}
                  to={`/battles/${b.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg transition-colors hover:border-organic/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Swords className="h-4 w-4 shrink-0 text-fg-subtle" />
                    <span className="truncate">vs {opponent?.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={cn('text-xs font-semibold', winning ? 'text-organic' : 'text-fg-subtle')}>
                      {winning ? 'Currently ahead' : 'Currently behind'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-fg-subtle" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {primaryCategory && relatedCompanies.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">
            More in {primaryCategory.name}
          </h2>
          <div className="flex flex-col gap-3">
            {relatedCompanies.map((c) => (
              <OrganicEntryCard key={c.id} company={c} ratingSummary={ratingSummariesQuery.data?.get(c.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function placementLabel(type: string) {
  switch (type) {
    case 'category_leaderboard':
      return 'Category leaderboard'
    case 'homepage_featured':
      return 'Homepage featured'
    case 'deal_spotlight':
      return 'Deal spotlight'
    default:
      return type
  }
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Globe }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-fg-subtle">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="font-numeral mt-1 truncate text-lg text-fg">{value}</p>
    </div>
  )
}
