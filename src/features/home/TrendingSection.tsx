import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useTrends, useAllCompanies } from '@/lib/supabase/hooks'
import { CompanyAvatar } from '@/components/ui/avatar'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

export function TrendingSection() {
  const trendsQuery = useTrends()
  const companiesQuery = useAllCompanies()

  if (trendsQuery.isLoading || companiesQuery.isLoading) return <LoadingState label="Loading trends…" />
  if (trendsQuery.isError || companiesQuery.isError) return <ErrorState message="Couldn't load trending content." />

  const companies = companiesQuery.data ?? []
  const sorted = [...(trendsQuery.data ?? [])].sort((a, b) => b.trendScore - a.trendScore).slice(0, 4)
  if (sorted.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <Flame className="h-5 w-5 text-brand" />
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Trending now</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sorted.map((trend) => {
          const related = trend.relatedCompanyIds
            .map((id) => companies.find((c) => c.id === id))
            .filter((c): c is NonNullable<typeof c> => Boolean(c))
          return (
            <div
              key={trend.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand/30"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {related.map((c) => (
                    <CompanyAvatar key={c.id} initials={c.initials} color={c.logoColor} logoUrl={c.logoUrl} size="sm" className="ring-2 ring-surface" />
                  ))}
                </div>
                <span className="font-numeral flex items-center gap-1 text-xs text-brand">
                  <Flame className="h-3 w-3" /> {trend.trendScore}
                </span>
              </div>
              <p className="font-semibold leading-snug text-fg">{trend.title}</p>
              <p className="mt-2 flex-1 text-sm text-fg-muted">{trend.summary}</p>
            </div>
          )
        })}
      </div>
      <Link to="/categories" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">
        Browse all categories →
      </Link>
    </section>
  )
}
