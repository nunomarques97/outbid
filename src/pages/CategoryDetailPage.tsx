import { useParams, Link, Navigate } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { Flame, Swords, Tag } from 'lucide-react'
import {
  useCategories,
  useCompaniesByCategory,
  usePlacements,
  useActiveBids,
  useBattles,
  useDeals,
  useTrends,
} from '@/lib/supabase/hooks'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { getCategoryRanking, CATEGORY_SPONSORED_SLOTS } from '@/lib/ranking'
import { LeaderboardList } from '@/components/leaderboard/LeaderboardList'
import { RankingExplainer } from '@/components/shared/RankingExplainer'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { useSeo } from '@/lib/useSeo'
import { buildCategoryDescription } from '@/lib/seoContent'
import { formatCompactNumber } from '@/lib/utils'

export function CategoryDetailPage() {
  const { slug } = useParams()
  const categoriesQuery = useCategories()

  // An archived category (merged into a broader one) is treated as
  // not-found — it's no longer a valid discovery destination, even for an
  // old bookmarked/shared link.
  const category = (categoriesQuery.data ?? []).find((c) => c.slug === slug && !c.isArchived)
  useSeo({
    title: category?.name,
    description: category ? buildCategoryDescription(category) : undefined,
    canonicalPath: slug ? `/categories/${slug}` : undefined,
  })

  if (categoriesQuery.isLoading) return <LoadingState label="Loading category…" />
  if (categoriesQuery.isError) return <ErrorState message="Couldn't load this category." />
  if (!category) return <Navigate to="/categories" replace />

  return <CategoryDetailContent categoryId={category.id} categoryName={category.name} categoryDescription={category.description} categoryIcon={category.icon} />
}

function CategoryDetailContent({
  categoryId,
  categoryName,
  categoryDescription,
  categoryIcon,
}: {
  categoryId: string
  categoryName: string
  categoryDescription: string
  categoryIcon: string
}) {
  const companiesQuery = useCompaniesByCategory(categoryId)
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  const battlesQuery = useBattles()
  const dealsQuery = useDeals()
  const trendsQuery = useTrends()

  const loading =
    companiesQuery.isLoading ||
    placementsQuery.isLoading ||
    bidsQuery.isLoading ||
    battlesQuery.isLoading ||
    dealsQuery.isLoading ||
    trendsQuery.isLoading
  const errored =
    companiesQuery.isError ||
    placementsQuery.isError ||
    bidsQuery.isError ||
    battlesQuery.isError ||
    dealsQuery.isError ||
    trendsQuery.isError

  if (loading) return <LoadingState label="Loading category…" />
  if (errored) return <ErrorState message="Couldn't load this category." />

  const categoryCompanies = companiesQuery.data ?? []
  const companyIds = new Set(categoryCompanies.map((c) => c.id))
  const relatedBattles = (battlesQuery.data ?? []).filter(
    (b) => companyIds.has(b.companyAId) || companyIds.has(b.companyBId),
  )
  const relatedDeals = (dealsQuery.data ?? []).filter((d) => companyIds.has(d.companyId))
  const relatedTrends = (trendsQuery.data ?? []).filter((t) => t.relatedCompanyIds.some((id) => companyIds.has(id)))
  const Icon = (Icons[categoryIcon as keyof typeof Icons] ?? Icons.Sparkles) as Icons.LucideIcon

  const globalPlacement = getGlobalPlacement(placementsQuery.data ?? [])
  const sponsoredCount = globalPlacement
    ? getCategoryRanking(categoryCompanies, bidsQuery.data ?? [], globalPlacement.id, categoryId, CATEGORY_SPONSORED_SLOTS).sponsored.length
    : 0
  const totalVotes = categoryCompanies.reduce((sum, c) => sum + c.organicVotes, 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised text-fg">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg">{categoryName}</h1>
          <p className="mt-1 text-fg-muted">{categoryDescription}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
            <span>
              <strong className="font-numeral text-fg-muted">{categoryCompanies.length}</strong> companies
            </span>
            <span>
              <strong className="font-numeral text-fg-muted">{formatCompactNumber(totalVotes)}</strong> community votes
            </span>
            <span>
              <strong className="font-numeral text-fg-muted">{sponsoredCount}</strong> sponsored spots
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <RankingExplainer />
      </div>

      <LeaderboardList categoryId={categoryId} />

      {relatedTrends.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-fg-muted">
            <Flame className="h-3.5 w-3.5 text-brand" /> Trending in {categoryName}
          </h2>
          <div className="flex flex-col gap-2">
            {relatedTrends.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                <p className="mt-1 text-sm text-fg-muted">{t.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(relatedBattles.length > 0 || relatedDeals.length > 0) && (
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {relatedBattles.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-fg-muted">
                <Swords className="h-3.5 w-3.5 text-organic" /> Related battles
              </h2>
              <div className="flex flex-col gap-2">
                {relatedBattles.map((b) => (
                  <Link
                    key={b.id}
                    to={`/battles/${b.id}`}
                    className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg transition-colors hover:border-organic/30"
                  >
                    Compare head-to-head →
                  </Link>
                ))}
              </div>
            </div>
          )}
          {relatedDeals.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-fg-muted">
                <Tag className="h-3.5 w-3.5 text-organic" /> Related deals
              </h2>
              <div className="flex flex-col gap-2">
                {relatedDeals.map((d) => (
                  <Link
                    key={d.id}
                    to="/deals"
                    className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg transition-colors hover:border-organic/30"
                  >
                    {d.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
