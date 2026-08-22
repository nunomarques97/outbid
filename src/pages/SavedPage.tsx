import { Link } from 'react-router-dom'
import { Bookmark, Compass } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useAllCompanies, useCategories, useAllCompanyRatingSummaries } from '@/lib/supabase/hooks'
import { useSavedCompanyIds } from '@/features/saved/useSavedCompanies'
import { OrganicEntryCard } from '@/components/leaderboard/OrganicEntryCard'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { buttonVariants } from '@/components/ui/button'

export function SavedPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) return <LoadingState label="Loading…" />
  if (!user) return <SignedOutState />

  return <SavedCompaniesContent />
}

function SignedOutState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <Bookmark className="mx-auto h-8 w-8 text-fg-subtle" />
      <h1 className="mt-4 text-2xl font-bold text-fg">Sign in to see your saved companies</h1>
      <p className="mt-2 text-fg-muted">
        Sign in from the header, then come back here to see everything you've bookmarked.
      </p>
    </div>
  )
}

function SavedCompaniesContent() {
  const savedIdsQuery = useSavedCompanyIds()
  const companiesQuery = useAllCompanies()
  const categoriesQuery = useCategories()
  // Supplementary — not part of the loading/error gate below, same as every
  // other discovery surface that shows ratings alongside company cards.
  const ratingSummariesQuery = useAllCompanyRatingSummaries()

  // isPending (not isLoading) for savedIdsQuery specifically: it's the one
  // query here that starts disabled until `user` resolves, so isLoading can
  // read false for a render or two right as it flips enabled.
  const loading = savedIdsQuery.isPending || companiesQuery.isLoading || categoriesQuery.isLoading
  const errored = savedIdsQuery.isError || companiesQuery.isError || categoriesQuery.isError

  if (loading) return <LoadingState label="Loading your saved companies…" />
  if (errored) return <ErrorState message="Couldn't load your saved companies." />

  const companies = companiesQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  // Preserves the "most recently saved first" order getSavedCompanyIds
  // already returns — no company data source needs to know about save
  // order itself.
  const savedCompanies = savedIdsQuery.data
    .map((id) => companies.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Saved companies</h1>
      <p className="mt-2 text-fg-muted">Everything you've bookmarked, in one place.</p>

      {savedCompanies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {savedCompanies.map((company) => (
            <OrganicEntryCard
              key={company.id}
              company={company}
              ratingSummary={ratingSummariesQuery.data?.get(company.id)}
              categoryNames={categories.filter((c) => company.categoryIds.includes(c.id)).map((c) => c.name)}
            />
          ))}
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
        Save companies you want to come back to — tap the bookmark icon on any profile, search result, or leaderboard
        entry.
      </p>
      <Link to="/categories" className={buttonVariants({ className: 'mt-6' })}>
        <Compass className="h-4 w-4" /> Browse categories
      </Link>
    </div>
  )
}
