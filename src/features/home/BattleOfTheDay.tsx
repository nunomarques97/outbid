import { Link } from 'react-router-dom'
import { Swords, ArrowRight } from 'lucide-react'
import { useBattles, useAllCompanies } from '@/lib/supabase/hooks'
import { VoteSplitBar } from '@/features/battles/VoteSplitBar'
import { buttonVariants } from '@/components/ui/button'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'

export function BattleOfTheDay() {
  const battlesQuery = useBattles()
  const companiesQuery = useAllCompanies()

  if (battlesQuery.isLoading || companiesQuery.isLoading) return <LoadingState label="Loading today's battle…" />
  if (battlesQuery.isError || companiesQuery.isError) return <ErrorState message="Couldn't load the battle of the day." />

  const featured = (battlesQuery.data ?? [])[0]
  if (!featured) return null

  const companies = companiesQuery.data ?? []
  const companyA = companies.find((c) => c.id === featured.companyAId)
  const companyB = companies.find((c) => c.id === featured.companyBId)
  if (!companyA || !companyB) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <Swords className="h-5 w-5 text-organic" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Battle of the day</h2>
          <p className="mt-0.5 text-sm text-fg-muted">Tap a side to cast your vote — see who the community trusts more.</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <VoteSplitBar
          battleId={featured.id}
          companyA={companyA}
          companyB={companyB}
          votesA={featured.votesA}
          votesB={featured.votesB}
        />
        <Link
          to={`/battles/${featured.id}`}
          className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-5' })}
        >
          See full comparison <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}
