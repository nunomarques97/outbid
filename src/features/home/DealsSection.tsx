import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { useDeals, useAllCompanies } from '@/lib/supabase/hooks'
import { DealCard } from '@/components/shared/DealCard'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

export function DealsSection() {
  const dealsQuery = useDeals()
  const companiesQuery = useAllCompanies()

  if (dealsQuery.isLoading || companiesQuery.isLoading) return <LoadingState label="Loading deals…" />
  if (dealsQuery.isError || companiesQuery.isError) return <ErrorState message="Couldn't load deals." />

  const featured = (dealsQuery.data ?? []).slice(0, 3)
  if (featured.length === 0) return null
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((deal) => {
          const company = companies.find((c) => c.id === deal.companyId)
          if (!company) return null
          return <DealCard key={deal.id} deal={deal} company={company} />
        })}
      </div>
    </section>
  )
}
