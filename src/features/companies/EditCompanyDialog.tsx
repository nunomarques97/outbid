import { useState } from 'react'
import { toast } from 'sonner'
import type { Company } from '@/mocks/types'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LogoPicker } from './LogoPicker'
import { useUploadCompanyLogo } from './useCompanyLogo'

interface EditCompanyDialogProps {
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "Edit Company" is deliberately logo-only for now — the task that added
 * this only asked for a proper preview/confirm/cancel flow around the logo,
 * not a full company-details editor. Company name/tagline/etc. are shown
 * read-only for context, not because they're editable here.
 *
 * Picking a file never uploads it — LogoPicker only creates a local object
 * URL preview. The file is only sent to Storage (and companies.logo_path
 * only updated) when the user clicks "Save changes", via the exact same
 * uploadCompanyLogo() used by company creation. Closing without saving, by
 * any means (Cancel, the X, the overlay, Escape), discards the picked file
 * without ever touching Storage — nothing to clean up, since nothing was
 * uploaded.
 */
export function EditCompanyDialog({ company, open, onOpenChange }: EditCompanyDialogProps) {
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  // Bumped whenever the pending pick is discarded, so a freshly-keyed
  // LogoPicker drops its own internal preview state instead of continuing
  // to show a file the parent has already forgotten about.
  const [pickerKey, setPickerKey] = useState(0)
  const logoUpload = useUploadCompanyLogo()

  function discardPending() {
    setPendingFile(null)
    setPickerKey((k) => k + 1)
  }

  function handleOpenChange(next: boolean) {
    if (!next) discardPending()
    onOpenChange(next)
  }

  async function handleSave() {
    if (!pendingFile) return
    try {
      await logoUpload.mutateAsync({ companyId: company.id, file: pendingFile, previousPath: company.logoPath })
      toast.success('Logo updated.')
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload that logo.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Edit company</DialogTitle>
        <DialogDescription>Update {company.name}'s logo.</DialogDescription>

        <div className="mt-5">
          <LogoPicker
            key={pickerKey}
            initials={company.initials}
            color={company.logoColor}
            currentLogoUrl={company.logoUrl}
            disabled={logoUpload.isPending}
            onFileSelected={setPendingFile}
          />
        </div>

        <dl className="mt-5 flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-3 text-sm">
          <Row label="Name" value={company.name} />
          <Row label="Tagline" value={company.tagline} />
          <Row label="Website" value={company.website} />
          <Row label="Founded" value={String(company.foundedYear)} />
        </dl>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={logoUpload.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!pendingFile || logoUpload.isPending}>
            {logoUpload.isPending ? 'Saving…' : 'Save changes'}
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
