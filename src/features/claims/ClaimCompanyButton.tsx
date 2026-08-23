import { useState } from 'react'
import { ShieldQuestion, Clock } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { useMyCompanies, useMyLatestClaim } from '@/lib/supabase/hooks'
import { getClaimCtaState } from '@/lib/claimState'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ClaimCompanyDialog } from './ClaimCompanyDialog'

interface ClaimCompanyButtonProps {
  companyId: string
  companyName: string
  className?: string
}

/**
 * "Represent this business?" CTA — shown only by the caller when the
 * company is unverified (see CompanyProfileContent). Deliberately says
 * nothing about quality or endorsement: claiming only establishes who
 * represents the company, and even after approval that's an identity fact,
 * not a Repcastr opinion of the business.
 *
 * A user who already manages a company never sees this at all (the RPC
 * would reject it server-side regardless — see create_company_claim's
 * one-company-per-user check — but hiding it client-side avoids offering
 * an action that can only fail). Same sign-in gate pattern as
 * ReportButton/VoteButton.
 */
export function ClaimCompanyButton({ companyId, companyName, className }: ClaimCompanyButtonProps) {
  const { user, isConfigured } = useAuth()
  const signedIn = isConfigured && Boolean(user)
  const [authOpen, setAuthOpen] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)

  const myCompaniesQuery = useMyCompanies()
  const managesAnyCompany = signedIn && (myCompaniesQuery.data?.length ?? 0) > 0

  const myClaimQuery = useMyLatestClaim(companyId)
  const hasPendingClaim = myClaimQuery.data?.status === 'pending'

  const ctaState = getClaimCtaState({ signedIn, managesAnyCompany, hasPendingClaim })

  if (ctaState === 'hidden') return null

  if (ctaState === 'pending') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-sm text-fg-muted', className)}>
        <Clock className="h-4 w-4" />
        Claim pending review
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (signedIn ? setClaimOpen(true) : setAuthOpen(true))}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), className)}
      >
        <ShieldQuestion className="h-3.5 w-3.5" />
        Claim this profile
      </button>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to claim this profile"
        description="Sign in so we know who to follow up with about representing this business."
      />
      {signedIn && (
        <ClaimCompanyDialog
          open={claimOpen}
          onOpenChange={setClaimOpen}
          companyId={companyId}
          companyName={companyName}
        />
      )}
    </>
  )
}
