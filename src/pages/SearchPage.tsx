import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search as SearchIcon, Tag, Flame, X } from 'lucide-react'
import {
  useAllCompanies,
  useCategories,
  useDeals,
  useTrends,
  useAllCompanyRatingSummaries,
  useSearchProfiles,
} from '@/lib/supabase/hooks'
import { CompanyAvatar } from '@/components/ui/avatar'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { CompanyRatingInline } from '@/features/reviews/CompanyRatingInline'
import { SaveButton } from '@/components/shared/SaveButton'
import { Input } from '@/components/ui/input'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [value, setValue] = useState(params.get('q') ?? '')

  const companiesQuery = useAllCompanies()
  const categoriesQuery = useCategories()
  const dealsQuery = useDeals()
  const trendsQuery = useTrends()
  const ratingSummariesQuery = useAllCompanyRatingSummaries()
  // Server-filtered (unlike companies/categories/deals/trends above, which
  // fetch everything and filter client-side) — profiles search never sends
  // the whole user base to the browser, and its own loading/error state is
  // handled locally in its result section rather than gating the page.
  const usersQuery = useSearchProfiles(value)

  // Keep the URL in sync (shareable/refreshable) without gating results on submit.
  useEffect(() => {
    const handle = setTimeout(() => {
      setParams(value ? { q: value } : {}, { replace: true })
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (companiesQuery.isLoading || categoriesQuery.isLoading || dealsQuery.isLoading || trendsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg">Search</h1>
        <LoadingState label="Loading search index…" />
      </div>
    )
  }
  if (companiesQuery.isError || categoriesQuery.isError || dealsQuery.isError || trendsQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg">Search</h1>
        <ErrorState message="Couldn't load search results right now." />
      </div>
    )
  }

  const companies = companiesQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const deals = dealsQuery.data ?? []
  const trends = trendsQuery.data ?? []

  const needle = value.trim().toLowerCase()
  const isSearching = needle.length > 0

  const matchedCompanies = isSearching
    ? companies.filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          c.tagline.toLowerCase().includes(needle) ||
          c.description.toLowerCase().includes(needle) ||
          c.tags.some((t) => t.toLowerCase().includes(needle)),
      )
    : []
  const matchedCategories = isSearching
    ? categories.filter((c) => c.name.toLowerCase().includes(needle) || c.description.toLowerCase().includes(needle))
    : []
  const matchedDeals = isSearching
    ? deals.filter((d) => d.title.toLowerCase().includes(needle) || d.description.toLowerCase().includes(needle))
    : []
  const matchedTrends = isSearching
    ? trends.filter((t) => t.title.toLowerCase().includes(needle) || t.summary.toLowerCase().includes(needle))
    : []

  const matchedUsers = isSearching ? usersQuery.data ?? [] : []

  const totalResults =
    matchedCompanies.length + matchedCategories.length + matchedDeals.length + matchedTrends.length + matchedUsers.length

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg">Search</h1>
      <div className="relative mt-6">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search companies, categories, deals, trends, people…"
          className="pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!isSearching && (
        <div className="mt-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">Browse by category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/categories/${c.slug}`}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-brand/30 hover:text-fg"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {isSearching && totalResults === 0 && !usersQuery.isLoading && (
        <div className="mt-10 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-fg">No results for &ldquo;{value}&rdquo;.</p>
          <p className="mt-1 text-sm text-fg-muted">Try a company name, category, a person, or a word from a deal or trend.</p>
        </div>
      )}

      {matchedUsers.length > 0 && (
        <ResultSection title="Users">
          {matchedUsers.map((u) => (
            <Link
              key={u.id}
              to={`/users/${u.username}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-brand/30"
            >
              <UserAvatar userId={u.id} displayName={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{u.displayName}</p>
                <p className="truncate text-xs text-fg-muted">
                  {u.reviewCount} review{u.reviewCount === 1 ? '' : 's'}
                </p>
              </div>
            </Link>
          ))}
        </ResultSection>
      )}

      {matchedCategories.length > 0 && (
        <ResultSection title="Categories">
          {matchedCategories.map((c) => (
            <Link
              key={c.id}
              to={`/categories/${c.slug}`}
              className="rounded-lg border border-border bg-surface px-4 py-3 text-fg transition-colors hover:border-brand/30"
            >
              {c.name}
            </Link>
          ))}
        </ResultSection>
      )}

      {matchedCompanies.length > 0 && (
        <ResultSection title="Companies">
          {matchedCompanies.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-brand/30"
            >
              <Link to={`/companies/${c.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CompanyAvatar initials={c.initials} color={c.logoColor} logoUrl={c.logoUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                  <p className="truncate text-xs text-fg-muted">{c.tagline}</p>
                  <CompanyRatingInline summary={ratingSummariesQuery.data?.get(c.id)} className="mt-0.5" />
                </div>
              </Link>
              <SaveButton companyId={c.id} size="sm" />
            </div>
          ))}
        </ResultSection>
      )}

      {matchedDeals.length > 0 && (
        <ResultSection title="Deals">
          {matchedDeals.map((d) => {
            const company = companies.find((c) => c.id === d.companyId)
            return (
              <Link
                key={d.id}
                to="/deals"
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-brand/30"
              >
                <Tag className="h-4 w-4 shrink-0 text-organic" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{d.title}</p>
                  <p className="truncate text-xs text-fg-muted">{company?.name}</p>
                </div>
              </Link>
            )
          })}
        </ResultSection>
      )}

      {matchedTrends.length > 0 && (
        <ResultSection title="Trends">
          {matchedTrends.map((t) => (
            <div key={t.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{t.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{t.summary}</p>
              </div>
            </div>
          ))}
        </ResultSection>
      )}
    </div>
  )
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-fg-muted">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
