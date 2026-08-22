import { useState, type ReactNode } from 'react'
import { useDeals, useAllCompanies, useCategories } from '@/lib/supabase/hooks'
import { DealCard } from '@/components/shared/DealCard'
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/QueryStates'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { cn } from '@/lib/utils'

export function DealsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  useDocumentTitle('Deals')

  const dealsQuery = useDeals()
  const companiesQuery = useAllCompanies()
  const categoriesQuery = useCategories()

  if (dealsQuery.isLoading || companiesQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Deals</h1>
        <LoadingState label="Loading deals…" />
      </div>
    )
  }
  if (dealsQuery.isError || companiesQuery.isError || categoriesQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Deals</h1>
        <ErrorState message="Couldn't load deals." />
      </div>
    )
  }

  const companies = companiesQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const visibleDeals = (dealsQuery.data ?? []).filter((deal) => {
    if (!activeCategory) return true
    const company = companies.find((c) => c.id === deal.companyId)
    return company?.categoryIds.includes(activeCategory) ?? false
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Deals</h1>
      <p className="mt-2 max-w-xl text-fg-muted">
        Offers from companies across every category, refreshed as they change theirs.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip active={activeCategory === null} onClick={() => setActiveCategory(null)}>
          All categories
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c.id} active={activeCategory === c.id} onClick={() => setActiveCategory(c.id)}>
            {c.name}
          </FilterChip>
        ))}
      </div>

      {visibleDeals.length === 0 ? (
        <div className="mt-8">
          <EmptyState message="No deals in this category right now." />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDeals.map((deal) => {
            const company = companies.find((c) => c.id === deal.companyId)
            if (!company) return null
            return <DealCard key={deal.id} deal={deal} company={company} />
          })}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-border bg-surface text-fg-muted hover:border-brand/30 hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
