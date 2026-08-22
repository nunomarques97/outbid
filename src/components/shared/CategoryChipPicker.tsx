import type { Category } from '@/mocks/types'
import { cn } from '@/lib/utils'

interface CategoryChipPickerProps {
  categories: Category[]
  selectedIds: string[]
  onToggle: (categoryId: string) => void
  /** Omit for no cap (e.g. a user's personal interests). Company category pickers pass MAX_COMPANY_CATEGORIES. */
  max?: number
  disabled?: boolean
}

/**
 * Compact multi-select as a row of toggleable chips — real <button>
 * elements with aria-pressed, so it's keyboard- and screen-reader-usable
 * without any extra plumbing. Shared by CreateCompanyForm,
 * EditCompanyDialog, and EditProfileDialog's interest picker so all three
 * multi-category pickers in the app look and behave identically.
 */
export function CategoryChipPicker({ categories, selectedIds, onToggle, max, disabled }: CategoryChipPickerProps) {
  const atMax = typeof max === 'number' && selectedIds.length >= max

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const selected = selectedIds.includes(category.id)
        const blocked = !selected && atMax
        return (
          <button
            key={category.id}
            type="button"
            disabled={disabled || blocked}
            aria-pressed={selected}
            onClick={() => onToggle(category.id)}
            title={blocked ? `You can choose up to ${max} categories.` : undefined}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              selected
                ? 'border-brand bg-brand/15 text-brand'
                : 'border-border bg-surface text-fg-muted hover:text-fg',
              blocked && 'cursor-not-allowed opacity-40 hover:text-fg-muted',
            )}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
