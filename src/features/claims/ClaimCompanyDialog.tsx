import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCreateCompanyClaim } from './useCreateCompanyClaim'

interface ClaimCompanyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
}

const REASON_MAX = 500
const EVIDENCE_MAX = 500

/**
 * The only claim path this phase builds: a manual review request. There is
 * no business-email verification option here — Repcastr has no
 * transactional email provider wired up, so an "email verified" state
 * would have nothing real behind it. Submitting here creates a
 * company_claims row via create_company_claim(); it does NOT verify or
 * transfer ownership of the company by itself — only a manual approval by
 * the operator (approve_company_claim, never callable from this client)
 * does that. Copy is deliberately about representation, not quality: a
 * claim/verification is never Repcastr's opinion of the business.
 */
export function ClaimCompanyDialog({ open, onOpenChange, companyId, companyName }: ClaimCompanyDialogProps) {
  const [reason, setReason] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [evidence, setEvidence] = useState('')
  const mutation = useCreateCompanyClaim()

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason('')
      setContactEmail('')
      setEvidence('')
    }
    onOpenChange(next)
  }

  function handleSubmit() {
    if (!reason.trim()) {
      toast.error('Tell us how you\'re connected to this business.')
      return
    }
    mutation.mutate(
      {
        companyId,
        reason: reason.trim(),
        contactEmail: contactEmail.trim() || null,
        evidence: evidence.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Claim submitted for review.', {
            description: "We'll review it manually — this doesn't change the profile until approved.",
          })
          handleOpenChange(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not submit claim.')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Claim {companyName}</DialogTitle>
        <DialogDescription>
          Tell us how you&rsquo;re connected to this business. A Repcastr operator reviews every claim
          manually — approval gives you ownership of this profile and marks it Verified. This never
          changes rankings, votes, or existing bids, and it&rsquo;s not a quality endorsement.
        </DialogDescription>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">How are you connected to this business?</span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            rows={3}
            disabled={mutation.isPending}
            placeholder="e.g. I'm the founder / I manage marketing for this company…"
          />
        </label>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Contact email (optional)</span>
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={mutation.isPending}
            placeholder="you@company.com"
          />
        </label>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Anything that helps us confirm this? (optional)</span>
          <Textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value.slice(0, EVIDENCE_MAX))}
            rows={2}
            disabled={mutation.isPending}
            placeholder="A work email domain, a link to your role on the company site, etc."
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting…' : 'Submit claim'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
