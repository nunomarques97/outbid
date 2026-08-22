import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { useDeals, useAllCompanies } from '@/lib/supabase/hooks'
import { getActiveDealsForDisplay } from '@/lib/dealState'
import { DealCard } from '@/components/shared/DealCard'
import { CreateDealCta } from '@/features/home/CreateDealCta'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

export function DealsSection() {
  const dealsQuery = useDeals()
  const companiesQuery = useAllCompanies()

  if (dealsQuery.isLoading || companiesQuery.isLoading) return <LoadingState label="Loading deals…" />
  if (dealsQuery.isError || companiesQuery.isError) return <ErrorState message="Couldn't load deals." />

  const featured = getActiveDealsForDisplay(dealsQuery.data ?? [], 3)
  const companies = companiesQuery.data ?? []

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-organic" />
          <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Live deals</h2>
        </div>
        <Link to="/deals" className="text-sm font-semibold text-brand hover:underline">
          View all deals
        </Link>
      </div>

      {featured.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center">
          <p className="font-semibold text-fg">No live deals right now</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">
            Advertisers haven't posted an active deal — check back soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((deal) => {
            const company = companies.find((c) => c.id === deal.companyId)
            if (!company) return null
            return <DealCard key={deal.id} deal={deal} company={company} />
          })}
        </div>
      )}

      <CreateDealCta className="mt-6" />
    </section>
  )
}
