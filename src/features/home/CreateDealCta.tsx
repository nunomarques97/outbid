import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompany } from '@/lib/supabase/hooks'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Advertiser-acquisition CTA next to Live Deals — not a customer checkout
 * flow. Routes to whichever step of the existing advertiser flow the
 * visitor is actually at, so this never duplicates auth, company creation,
 * or deal-management UI: sign-in uses the same AuthDialog every other
 * gated action uses; company creation is the existing /dashboard/new page;
 * an existing advertiser goes straight to the Deals tab of their own
 * dashboard (see DashboardContent's tab-from-?tab= initialization).
 */
export function CreateDealCta({ className }: { className?: string }) {
  const { user, isConfigured } = useAuth()
  const companyQuery = useMyCompany()
  const navigate = useNavigate()
  const [authOpen, setAuthOpen] = useState(false)

  function handleClick() {
    if (!isConfigured || !user) {
      setAuthOpen(true)
      return
    }
    navigate(companyQuery.data ? '/dashboard?tab=deals' : '/dashboard/new')
  }

  return (
    <div
      className={cn(
        'flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-border bg-surface/60 p-6 sm:flex-row sm:items-center',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Megaphone className="h-5 w-5 shrink-0 text-brand" />
        <div>
          <p className="font-semibold text-fg">Have a company?</p>
          <p className="mt-0.5 text-sm text-fg-muted">Create a deal and get your offer in front of Outbid customers.</p>
        </div>
      </div>
      <Button type="button" onClick={handleClick} className="w-full shrink-0 sm:w-auto">
        Create a deal
      </Button>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to create a deal"
        description="Sign in or create an account, then set up your company to start posting deals on Outbid."
      />
    </div>
  )
}
