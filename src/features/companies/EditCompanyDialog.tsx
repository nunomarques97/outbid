import { useState } from 'react'
import { toast } from 'sonner'
import type { Company } from '@/mocks/types'
import { useCategories } from '@/lib/supabase/hooks'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CategoryChipPicker } from '@/components/shared/CategoryChipPicker'
import { validateCategorySelection, MAX_COMPANY_CATEGORIES } from '@/lib/companyCategories'
import { LogoPicker } from './LogoPicker'
import { useUploadCompanyLogo } from './useCompanyLogo'
import { useSetCompanyCategories } from './useCompanyCategory'

interface EditCompanyDialogProps {
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Logo + category — the two fields that (a) genuinely need a preview/undo
 * flow (logo) or (b) can currently be entirely missing on an existing
 * company with no way to fix it otherwise (category — see
 * *_company_categories_write.sql; every company created before that
 * migration has zero categories and is invisible to category-based
 * discovery). Company name/tagline/etc. are shown read-only for context,
 * not because they're editable here — that remains genuinely out of this
 * scope.
 *
 * Picking a logo file never uploads it — LogoPicker only creates a local
 * object URL preview. Changing the category select doesn't write anything
 * either. Both are only sent to Supabase when "Save changes" is clicked;
 * closing without saving, by any means, discards both pending choices.
 */
export function EditCompanyDialog({ company, open, onOpenChange }: EditCompanyDialogProps) {
  const currentCategoryIds = company.categoryIds
  const categoriesQuery = useCategories()

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  // Bumped whenever the pending logo pick is discarded, so a freshly-keyed
  // LogoPicker drops its own internal preview state instead of continuing
  // to show a file the parent has already forgotten about.
  const [pickerKey, setPickerKey] = useState(0)
  const [categoryIds, setCategoryIds] = useState<string[]>(currentCategoryIds)

  const logoUpload = useUploadCompanyLogo()
  const setCategoriesMutation = useSetCompanyCategories()
  const saving = logoUpload.isPending || setCategoriesMutation.isPending

  const categoriesChanged =
    categoryIds.length !== currentCategoryIds.length ||
    [...categoryIds].sort().some((id, i) => id !== [...currentCategoryIds].sort()[i])
  const hasChanges = Boolean(pendingFile) || categoriesChanged

  function toggleCategory(categoryId: string) {
    setCategoryIds((prev) => (prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]))
  }

  function discardPending() {
    setPendingFile(null)
    setPickerKey((k) => k + 1)
    setCategoryIds(currentCategoryIds)
  }

  function handleOpenChange(next: boolean) {
    if (!next) discardPending()
    onOpenChange(next)
  }

  async function handleSave() {
    if (categoriesChanged) {
      const categoryError = validateCategorySelection(categoryIds)
      if (categoryError) {
        toast.error(categoryError)
        return
      }
    }
    try {
      if (pendingFile) {
        await logoUpload.mutateAsync({ companyId: company.id, file: pendingFile, previousPath: company.logoPath })
      }
      if (categoriesChanged) {
        await setCategoriesMutation.mutateAsync({ companyId: company.id, categoryIds })
      }
      toast.success('Company updated.')
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save changes.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Edit company</DialogTitle>
        <DialogDescription>Update {company.name}'s logo and categories.</DialogDescription>

        <div className="mt-5">
          <LogoPicker
            key={pickerKey}
            initials={company.initials}
            color={company.logoColor}
            currentLogoUrl={company.logoUrl}
            disabled={saving}
            onFileSelected={setPendingFile}
          />
        </div>

        <div className="mt-5">
          <span className="text-sm font-medium text-fg">Categories</span>
          <p className="mt-0.5 text-xs text-fg-subtle">
            Choose up to {MAX_COMPANY_CATEGORIES} categories that best describe your company.
          </p>
          {currentCategoryIds.length === 0 && (
            <p className="mt-1.5 text-xs text-danger">
              This company has no category yet, so it won't appear in any category ranking. Choose at least one below.
            </p>
          )}
          <div className="mt-2">
            <CategoryChipPicker
              categories={(categoriesQuery.data ?? []).filter((c) => !c.isArchived)}
              selectedIds={categoryIds}
              onToggle={toggleCategory}
              max={MAX_COMPANY_CATEGORIES}
              disabled={saving}
            />
          </div>
        </div>

        <dl className="mt-5 flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-3 text-sm">
          <Row label="Name" value={company.name} />
          <Row label="Tagline" value={company.tagline} />
          <Row label="Website" value={company.website} />
          <Row label="Founded" value={String(company.foundedYear)} />
        </dl>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-fg-subtle">{label}</dt>
      <dd className="truncate text-right font-medium text-fg">{value}</dd>
    </div>
  )
}
