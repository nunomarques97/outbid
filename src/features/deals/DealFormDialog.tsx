import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Deal } from '@/mocks/types'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCreateDeal, useUpdateDeal } from './useDealManagement'

interface DealFormDialogProps {
  companyId: string
  /** Present → editing that deal, submits an update. Absent → creating a new one. */
  existingDeal?: Deal | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** "2026-09-15T23:59:00Z" -> "2026-09-15", for <input type="date">. */
function toDateInputValue(iso: string): string {
  return iso.slice(0, 10)
}

/** "2026-09-15" -> "2026-09-15T23:59:00Z" — end of day, matching how every seeded deal's expires_at is already shaped. */
function fromDateInputValue(dateStr: string): string {
  return `${dateStr}T23:59:00Z`
}

const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i

/**
 * Handles both creating a new deal and editing an existing one — the only
 * difference is which mutation submit calls and whether fields start
 * blank or pre-filled, same shape as ReviewForm. There's no "disable"
 * toggle: setting expiresAt to a past date is how an advertiser takes a
 * deal down without deleting it, reusing the exact expiry logic every
 * deal-consuming surface already depends on.
 */
export function DealFormDialog({ companyId, existingDeal, open, onOpenChange }: DealFormDialogProps) {
  const [title, setTitle] = useState(existingDeal?.title ?? '')
  const [discountLabel, setDiscountLabel] = useState(existingDeal?.discountLabel ?? '')
  const [description, setDescription] = useState(existingDeal?.description ?? '')
  const [expiresAt, setExpiresAt] = useState(existingDeal ? toDateInputValue(existingDeal.expiresAt) : '')
  const [destinationUrl, setDestinationUrl] = useState(existingDeal?.destinationUrl ?? '')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateDeal()
  const updateMutation = useUpdateDeal()
  const submitting = createMutation.isPending || updateMutation.isPending

  function validate(): string | null {
    if (title.trim().length < 3) return 'Enter a title for the deal.'
    if (discountLabel.trim().length < 2) return 'Enter a short discount label, e.g. "20% off".'
    if (description.trim().length < 10) return 'Description should be at least 10 characters.'
    if (!expiresAt) return 'Choose an expiry date.'
    const trimmedUrl = destinationUrl.trim()
    if (trimmedUrl && !DOMAIN_PATTERN.test(trimmedUrl)) return 'Enter a valid domain, e.g. example.com/summer-sale'
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const validationError = validate()
    setError(validationError)
    if (validationError) return

    const input = {
      title: title.trim(),
      discountLabel: discountLabel.trim(),
      description: description.trim(),
      expiresAt: fromDateInputValue(expiresAt),
      destinationUrl: destinationUrl.trim() || null,
    }

    try {
      if (existingDeal) {
        await updateMutation.mutateAsync({ dealId: existingDeal.id, ...input })
        toast.success('Deal updated.')
      } else {
        await createMutation.mutateAsync({ companyId, ...input })
        toast.success('Deal created.')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save this deal.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{existingDeal ? 'Edit deal' : 'New deal'}</DialogTitle>
        <DialogDescription>
          Customers will see this deal on your company profile, search, and the homepage.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Title</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="20% off your first order" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Discount label</span>
            <Input value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} placeholder="20% off" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Description</span>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What the customer gets, and any conditions that apply."
              rows={3}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Expires</span>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <span className="text-xs text-fg-subtle">
              Set this to today or earlier at any time to take the deal down without deleting it.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Deal link (optional)</span>
            <Input
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="example.com/summer-sale"
            />
            <span className="text-xs text-fg-subtle">Defaults to your company website if left blank.</span>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : existingDeal ? 'Save changes' : 'Create deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
