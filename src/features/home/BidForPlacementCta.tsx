import { Rocket } from 'lucide-react'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { Button } from '@/components/ui/button'
import { useBidCta } from './useBidCta'

/**
 * Sits directly below Top Bidders — the moment a visitor has just seen who's
 * winning sponsored placement is the natural place to invite them to compete
 * for it. Same routing pattern as CreateCompanyCta/CreateDealCta: never lands
 * anyone on a flow guaranteed to fail. Signed out gets the normal auth
 * dialog (existing sign-in flow, unchanged — this app has no "continue where
 * you left off after sign-in" mechanism to hook into, so this doesn't invent
 * one, same as every other gated homepage CTA). Signed in with no company
 * goes to company creation. Signed in with a company goes straight to the
 * Bids tab of their own dashboard (DashboardContent already reads ?tab= on
 * mount — see CreateDealCta's ?tab=deals for the established precedent).
 */
export function BidForPlacementCta() {
  const { handleClick, authOpen, setAuthOpen } = useBidCta()

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-border bg-surface/60 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Rocket className="h-5 w-5 shrink-0 text-brand" />
          <div>
            <p className="font-semibold text-fg">Want the top spot?</p>
            <p className="mt-0.5 text-sm text-fg-muted">
              Bid for sponsored placement — the highest bid wins, and every bid is public.
            </p>
          </div>
        </div>
        <Button type="button" onClick={handleClick} className="w-full shrink-0 sm:w-auto">
          Bid for placement
        </Button>

        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          title="Sign in to bid for placement"
          description="Sign in or create an account, then set up your company to start bidding on Repcastr."
        />
      </div>
    </section>
  )
}
