import { useState } from 'react'
import { toast } from 'sonner'
import type { Company } from '@/mocks/types'
import { useCategories } from '@/lib/supabase/hooks'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { LogoPicker } from './LogoPicker'
import { useUploadCompanyLogo } from './useCompanyLogo'
import { useSetCompanyCategory } from './useCompanyCategory'

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
  const currentCategoryId = company.categoryIds[0] ?? ''
  const categoriesQuery = useCategories()

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  // Bumped whenever the pending logo pick is discarded, so a freshly-keyed
  // LogoPicker drops its own internal preview state instead of continuing
  // to show a file the parent has already forgotten about.
  const [pickerKey, setPickerKey] = useState(0)
  const [categoryId, setCategoryId] = useState(currentCategoryId)

  const logoUpload = useUploadCompanyLogo()
  const setCategoryMutation = useSetCompanyCategory()
  const saving = logoUpload.isPending || setCategoryMutation.isPending

  const categoryChanged = categoryId !== currentCategoryId
  const hasChanges = Boolean(pendingFile) || categoryChanged

  function discardPending() {
    setPendingFile(null)
    setPickerKey((k) => k + 1)
    setCategoryId(currentCategoryId)
  }

  function handleOpenChange(next: boolean) {
    if (!next) discardPending()
    onOpenChange(next)
  }

  async function handleSave() {
    if (categoryChanged && !categoryId) {
      toast.error('Choose a category.')
      return
    }
    try {
      if (pendingFile) {
        await logoUpload.mutateAsync({ companyId: company.id, file: pendingFile, previousPath: company.logoPath })
      }
      if (categoryChanged) {
        await setCategoryMutation.mutateAsync({ companyId: company.id, categoryId })
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
        <DialogDescription>Update {company.name}'s logo and category.</DialogDescription>

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

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Category</span>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={saving}>
            <option value="">Choose a category…</option>
            {(categoriesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {!currentCategoryId && (
            <span className="text-xs text-danger">
              This company has no category yet, so it won't appear in any category ranking. Choose one below.
            </span>
          )}
        </label>

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
