import { Link } from 'react-router-dom'
import { Bookmark, Compass, Tag } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useAllCompanies, useCategories, useAllCompanyRatingSummaries, useDeals } from '@/lib/supabase/hooks'
import { useSavedCompanyIds } from '@/features/saved/useSavedCompanies'
import { useMyClaimedDealIds } from '@/features/deals/useDealClaims'
import { OrganicEntryCard } from '@/components/leaderboard/OrganicEntryCard'
import { DealCard } from '@/components/shared/DealCard'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { buttonVariants } from '@/components/ui/button'

export function SavedPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) return <LoadingState label="Loading…" />
  if (!user) return <SignedOutState />

  return <SavedContent />
}

function SignedOutState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <Bookmark className="mx-auto h-8 w-8 text-fg-subtle" />
      <h1 className="mt-4 text-2xl font-bold text-fg">Sign in to see what you've saved</h1>
      <p className="mt-2 text-fg-muted">
        Sign in from the header, then come back here to see your saved companies and claimed deals.
      </p>
    </div>
  )
}

function SavedContent() {
  const savedIdsQuery = useSavedCompanyIds()
  const claimedDealIdsQuery = useMyClaimedDealIds()
  const companiesQuery = useAllCompanies()
  const categoriesQuery = useCategories()
  const dealsQuery = useDeals()
  // Supplementary — not part of the loading/error gate below, same as every
  // other discovery surface that shows ratings alongside company cards.
  const ratingSummariesQuery = useAllCompanyRatingSummaries()

  // isPending (not isLoading) for the two per-user queries specifically:
  // they start disabled until `user` resolves, so isLoading can read false
  // for a render or two right as they flip enabled.
  const loading =
    savedIdsQuery.isPending ||
    claimedDealIdsQuery.isPending ||
    companiesQuery.isLoading ||
    categoriesQuery.isLoading ||
    dealsQuery.isLoading
  const errored =
    savedIdsQuery.isError || claimedDealIdsQuery.isError || companiesQuery.isError || categoriesQuery.isError || dealsQuery.isError

  if (loading) return <LoadingState label="Loading what you've saved…" />
  if (errored) return <ErrorState message="Couldn't load your saved companies and deals." />

  const companies = companiesQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const deals = dealsQuery.data ?? []

  // Preserves the "most recent first" order the underlying queries already
  // return — neither company nor deal data needs to know about save/claim
  // order itself.
  const savedCompanies = savedIdsQuery.data
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  const claimedDeals = claimedDealIdsQuery.data
    .map((id) => deals.find((d) => d.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))

  if (savedCompanies.length === 0 && claimedDeals.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Saved</h1>
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Saved</h1>
      <p className="mt-2 text-fg-muted">Companies and deals you've bookmarked, in one place.</p>

      {savedCompanies.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">Saved companies</h2>
          <div className="flex flex-col gap-3">
            {savedCompanies.map((company) => (
              <OrganicEntryCard
                key={company.id}
                company={company}
                ratingSummary={ratingSummariesQuery.data?.get(company.id)}
                categoryNames={categories.filter((c) => company.categoryIds.includes(c.id)).map((c) => c.name)}
              />
            ))}
          </div>
        </div>
      )}

      {claimedDeals.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">Claimed deals</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {claimedDeals.map((deal) => {
              const company = companies.find((c) => c.id === deal.companyId)
              if (!company) return null
              return <DealCard key={deal.id} deal={deal} company={company} />
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-xl border border-border bg-surface p-10 text-center">
      <Bookmark className="h-8 w-8 text-fg-subtle" />
      <p className="mt-4 font-semibold text-fg">Nothing saved yet</p>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        Save companies you want to come back to, or claim a deal — tap the bookmark icon on any profile, or "Claim
        deal" on any offer.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/categories" className={buttonVariants({})}>
          <Compass className="h-4 w-4" /> Browse categories
        </Link>
        <Link to="/deals" className={buttonVariants({ variant: 'secondary' })}>
          <Tag className="h-4 w-4" /> Browse deals
        </Link>
      </div>
    </div>
  )
}
