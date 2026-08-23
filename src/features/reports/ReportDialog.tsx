import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { ReportTargetType, ReportReason } from '@/lib/supabase/mutations'
import { useCreateReport } from './useCreateReport'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'fake_or_misleading', label: 'Fake or misleading' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'illegal_content', label: 'Illegal content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
]

const TARGET_LABEL: Record<ReportTargetType, string> = {
  review: 'review',
  company: 'company',
  deal: 'deal',
}

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: ReportTargetType
  targetId: string
}

/**
 * The one report dialog shared by reviews, company profiles, and deals —
 * only the target type/id changes per caller. Submission goes through
 * create_report() (see the migration), which already returns
 * human-readable errors (e.g. "You already have a pending report for
 * this"), so this shows err.message directly rather than re-deriving it.
 */
export function ReportDialog({ open, onOpenChange, targetType, targetId }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>('spam')
  const [description, setDescription] = useState('')
  const mutation = useCreateReport()

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason('spam')
      setDescription('')
    }
    onOpenChange(next)
  }

  function handleSubmit() {
    mutation.mutate(
      { targetType, targetId, reason, description: description.trim() || null },
      {
        onSuccess: () => {
          toast.success('Thanks. Your report has been submitted.')
          handleOpenChange(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not submit report.')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Report this {TARGET_LABEL[targetType]}</DialogTitle>
        <DialogDescription>
          Let us know what's wrong. Reports are reviewed manually — this doesn't notify anyone
          else immediately.
        </DialogDescription>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Reason</span>
          <Select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} disabled={mutation.isPending}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Description (optional)</span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            rows={3}
            disabled={mutation.isPending}
            placeholder="Any extra detail that would help us understand the issue."
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting…' : 'Submit report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
