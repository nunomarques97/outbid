import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompany } from '@/lib/supabase/hooks'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { Button } from '@/components/ui/button'

/**
 * The homepage's advertiser-acquisition entry point — distinct from
 * CreateDealCta (which targets an advertiser who already has a company,
 * offering to create a deal). This one routes a visitor to whichever step
 * of the existing flow they're actually at, and never lands anyone on a
 * form guaranteed to fail: signed out gets the normal auth dialog, signed
 * in with no company goes to company creation, signed in with a company
 * goes straight to their dashboard instead of a form that would just
 * reject them (one company per account).
 */
export function CreateCompanyCta() {
  const { user, isConfigured } = useAuth()
  const companyQuery = useMyCompany()
  const navigate = useNavigate()
  const [authOpen, setAuthOpen] = useState(false)

  function handleClick() {
    if (!isConfigured || !user) {
      setAuthOpen(true)
      return
    }
    navigate(companyQuery.data ? '/dashboard' : '/dashboard/new')
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-border bg-surface/60 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 shrink-0 text-brand" />
          <div>
            <p className="font-semibold text-fg">Have a company?</p>
            <p className="mt-0.5 text-sm text-fg-muted">Set up your public profile and start competing for visibility.</p>
          </div>
        </div>
        <Button type="button" onClick={handleClick} className="w-full shrink-0 sm:w-auto">
          Create your company profile <ArrowRight className="h-4 w-4" />
        </Button>

        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          title="Sign in to create your company"
          description="Sign in or create an account, then set up your company profile on Repcastr."
        />
      </div>
    </section>
  )
}
