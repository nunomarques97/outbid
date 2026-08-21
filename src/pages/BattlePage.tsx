import { useParams, Navigate, Link } from 'react-router-dom'
import { Check, Minus, ArrowLeft } from 'lucide-react'
import { useBattle, useAllCompanies, useCategories } from '@/lib/supabase/hooks'
import { VoteSplitBar } from '@/features/battles/VoteSplitBar'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { cn } from '@/lib/utils'

export function BattlePage() {
  const { id } = useParams()
  const battleQuery = useBattle(id)
  const companiesQuery = useAllCompanies()
  const categoriesQuery = useCategories()

  if (battleQuery.isLoading || companiesQuery.isLoading || categoriesQuery.isLoading) {
    return <LoadingState label="Loading battle…" />
  }
  if (battleQuery.isError || companiesQuery.isError || categoriesQuery.isError) {
    return <ErrorState message="Couldn't load this battle." />
  }

  const battle = battleQuery.data
  if (!battle) return <Navigate to="/categories" replace />

  const companies = companiesQuery.data ?? []
  const companyA = companies.find((c) => c.id === battle.companyAId)
  const companyB = companies.find((c) => c.id === battle.companyBId)
  if (!companyA || !companyB) return <Navigate to="/categories" replace />

  const sharedCategory = (categoriesQuery.data ?? []).find(
    (c) => companyA.categoryIds.includes(c.id) && companyB.categoryIds.includes(c.id),
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {sharedCategory && (
        <Link
          to={`/categories/${sharedCategory.slug}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {sharedCategory.name}
        </Link>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
        {companyA.name} vs {companyB.name}
      </h1>
      <p className="mt-1 text-fg-muted">Vote for the one you’d actually recommend.</p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <VoteSplitBar
          battleId={battle.id}
          companyA={companyA}
          companyB={companyB}
          votesA={battle.votesA}
          votesB={battle.votesB}
        />
      </div>

      {battle.criteria.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-surface-raised text-left text-fg-muted">
                <th className="px-4 py-3 font-medium">Criteria</th>
                <th className="px-4 py-3 font-medium">{companyA.name}</th>
                <th className="px-4 py-3 font-medium">{companyB.name}</th>
              </tr>
            </thead>
            <tbody>
              {battle.criteria.map((row, i) => (
                <tr key={row.label} className={cn('border-t border-border', i % 2 === 1 && 'bg-surface/50')}>
                  <td className="px-4 py-3 font-medium text-fg-muted">{row.label}</td>
                  <td className={cn('px-4 py-3', row.winner === 'a' ? 'text-organic font-semibold' : 'text-fg')}>
                    <span className="inline-flex items-center gap-1.5">
                      {row.winner === 'a' ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5 opacity-30" />}
                      {row.aValue}
                    </span>
                  </td>
                  <td className={cn('px-4 py-3', row.winner === 'b' ? 'text-organic font-semibold' : 'text-fg')}>
                    <span className="inline-flex items-center gap-1.5">
                      {row.winner === 'b' ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5 opacity-30" />}
                      {row.bValue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to={`/companies/${companyA.slug}`}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-brand/30"
        >
          {companyA.name} profile →
        </Link>
        <Link
          to={`/companies/${companyB.slug}`}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-brand/30"
        >
          {companyB.name} profile →
        </Link>
      </div>
    </div>
  )
}
