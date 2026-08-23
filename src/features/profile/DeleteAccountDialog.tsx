import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/shared/QueryStates'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompany } from '@/lib/supabase/hooks'
import { CONTACT_EMAIL } from '@/lib/contact'
import { useDeleteAccount } from './useProfileMutations'

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Authoritative product rule (Phase 36): a user managing a company cannot
 * self-delete — their company would otherwise be left ownerless, with its
 * bid/payment history attached to nothing. That check is re-derived
 * server-side by the delete-account Edge Function regardless of what this
 * dialog shows; useMyCompany() here only decides which of the two states
 * to render, it isn't itself a security boundary.
 */
export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const { signOut } = useAuth()
  const companyQuery = useMyCompany()
  const navigate = useNavigate()
  const deleteMutation = useDeleteAccount()

  async function handleConfirmDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: async () => {
        toast.success('Your account has been deleted.')
        await signOut()
        navigate('/', { replace: true })
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Could not delete your account.')
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Delete account</DialogTitle>

        {companyQuery.isPending ? (
          <div className="mt-4">
            <LoadingState label="Checking your account…" />
          </div>
        ) : companyQuery.data ? (
          <>
            <DialogDescription>You manage a company. Account deletion requires a manual request.</DialogDescription>
            <p className="mt-4 text-sm text-fg-muted">
              Deleting your account while you manage a company would leave it without an owner —
              including its sponsored bid and payment history. Email us and we'll help you close
              it out properly:
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogDescription>
              This permanently deletes your account — your profile, reviews, votes, saved
              companies, and watched deals. This cannot be undone.
            </DialogDescription>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/20 disabled:pointer-events-none disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
