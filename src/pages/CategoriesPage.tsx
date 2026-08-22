import { Link } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { useCategories, useAllCompanies } from '@/lib/supabase/hooks'
import { LoadingState, ErrorState, EmptyState } from '@/components/shared/QueryStates'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export function CategoriesPage() {
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  useDocumentTitle('Categories')

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">Categories</h1>
      <p className="mt-2 max-w-xl text-fg-muted">
        Every category blends a small sponsored section with a community-ranked list beneath it.
      </p>

      {categoriesQuery.isLoading || companiesQuery.isLoading ? (
        <LoadingState label="Loading categories…" />
      ) : categoriesQuery.isError || companiesQuery.isError ? (
        <ErrorState message="Couldn't load categories." />
      ) : (categoriesQuery.data ?? []).filter((c) => !c.isArchived).length === 0 ? (
        <EmptyState message="No categories yet." />
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {(categoriesQuery.data ?? []).filter((c) => !c.isArchived).map((category) => {
            const Icon = (Icons[category.icon as keyof typeof Icons] ?? Icons.Sparkles) as Icons.LucideIcon
            const count = (companiesQuery.data ?? []).filter((c) => c.categoryIds.includes(category.id)).length
            return (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="flex flex-col rounded-xl border border-border bg-surface p-6 transition-colors hover:border-brand/30"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-raised text-fg">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-lg font-semibold text-fg">{category.name}</p>
                <p className="mt-1.5 flex-1 text-sm text-fg-muted">{category.description}</p>
                <p className="font-numeral mt-4 text-sm text-fg-subtle">{count} companies ranked</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
