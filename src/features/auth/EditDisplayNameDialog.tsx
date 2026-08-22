import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useMyDisplayName, useUpdateDisplayName } from './useDisplayName'

interface EditDisplayNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The one place a customer can change the name their reviews show — was
 * missing entirely: profiles has had self-update RLS since Phase 3, but
 * nothing in the UI ever surfaced it, so anyone who signed up without
 * choosing a name (pre-Phase-23) had no way to replace the email-derived
 * fallback. Only affects reviews written after saving here — past reviews
 * keep whatever name was current when they were written (see
 * reviews_set_author_name in *_reviews.sql), which is intentional, not a
 * bug: this never rewrites review history.
 */
export function EditDisplayNameDialog({ open, onOpenChange }: EditDisplayNameDialogProps) {
  const nameQuery = useMyDisplayName()
  const mutation = useUpdateDisplayName()
  const [value, setValue] = useState('')

  // Adjusting state during render (React's documented pattern for "reset
  // state when a prop changes") rather than an effect — prefills `value`
  // once the current name has loaded, and again every time the dialog is
  // (re)opened, so a cancelled edit never lingers into the next visit.
  const [seeded, setSeeded] = useState<{ open: boolean; data: string | undefined }>({ open, data: nameQuery.data })
  if (seeded.open !== open || seeded.data !== nameQuery.data) {
    setSeeded({ open, data: nameQuery.data })
    if (open && nameQuery.data !== undefined) setValue(nameQuery.data)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      toast.error('Display name must be at least 2 characters.')
      return
    }
    try {
      await mutation.mutateAsync(trimmed)
      toast.success('Display name updated.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update your display name.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Display name</DialogTitle>
        <DialogDescription>Shown publicly on reviews you write. Your email is never shown.</DialogDescription>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <Input
            required
            minLength={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Display name"
            disabled={nameQuery.isPending}
            autoComplete="name"
          />
          <Button type="submit" disabled={mutation.isPending || nameQuery.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
