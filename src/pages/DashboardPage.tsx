import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { Company } from '@/mocks/types'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompany, usePlacements, useActiveBids, useAllCompanies } from '@/lib/supabase/hooks'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { usePlaceBid, useCreateBidPayment } from '@/features/dashboard/useDashboardBids'
import { getBidSubmitDecision } from '@/lib/bidPayment'
import { getGlobalBidStatus } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { EditCompanyDialog } from '@/features/companies/EditCompanyDialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PositionCard } from '@/features/dashboard/PositionCard'
import { OutbidBanner } from '@/features/dashboard/OutbidBanner'
import { CompetitorBidTable } from '@/features/dashboard/CompetitorBidTable'
import { BidAdjustControl } from '@/features/dashboard/BidAdjustControl'
import { StartBidCard } from '@/features/dashboard/StartBidCard'
import { CompanyDealsTab } from '@/features/dashboard/CompanyDealsTab'
import { BillingHistoryTab } from '@/features/dashboard/BillingHistoryTab'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCurrency } from '@/lib/utils'

/**
 * Repcastr v1 is one-company-per-user (enforced server-side — see
 * company_members_user_id_unique in 20260822080000_one_company_per_user.sql).
 * There is no company selection step: the dashboard loads the signed-in
 * user's one company directly, or the "create your first company" state if
 * they don't have one yet. No switcher, no selectedId, nothing to key a
 * remount off of — the entire class of cross-company stale-render bug this
 * replaced (Phase 31.1) is structurally impossible now, since there is
 * never more than one company for this page to render.
 */
export function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const companyQuery = useMyCompany()
  useBidPaymentRedirectHandling()

  if (authLoading) return <LoadingState label="Loading your dashboard…" />
  if (!user) return <SignedOutState />

  // isPending (not isLoading) deliberately: this query starts disabled until
  // `user` exists, so isLoading can read false for a render or two right as
  // it flips enabled — isPending stays accurate ("no data yet") regardless.
  if (companyQuery.isPending) return <LoadingState label="Loading your dashboard…" />
  if (companyQuery.isError) return <ErrorState message="Couldn't load your company." />

  if (!companyQuery.data) return <NoCompanyState />

  return <DashboardWithCompany company={companyQuery.data} />
}

/**
 * Handles the redirect back from Stripe Checkout. The URL param is only
 * ever a hint for which toast to show and when to nudge a refetch — it is
 * NOT treated as proof the bid actually changed. The real state comes from
 * the stripe-webhook Edge Function activating the payment server-side,
 * which is typically near-instant but is inherently async: this refetch
 * might land a moment before or after it, in which case the next natural
 * refetch (focus, interval, or another action) picks up the true state.
 */
function useBidPaymentRedirectHandling() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  useEffect(() => {
    const status = searchParams.get('bidPayment')
    if (!status) return

    if (status === 'success') {
      toast.success('Payment received — confirming your bid, this may take a few seconds.')
      queryClient.invalidateQueries({ queryKey: ['activeBids'] })
      // Not scoped to one companyId: cheap, infrequent (once per redirect
      // back from Checkout), and this hook doesn't otherwise know which
      // company the payment was for.
      queryClient.invalidateQueries({ queryKey: ['bidPayments'] })
    } else if (status === 'cancelled') {
      toast('Payment cancelled — your bid was not changed.')
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('bidPayment')
        return next
      },
      { replace: true },
    )
    // The `status` guard above makes this safe to depend on the whole
    // (identity-unstable) searchParams object: once the param is removed,
    // status is null on the next run and the body no-ops.
  }, [searchParams, setSearchParams, queryClient])
}

function SignedOutState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-fg">Sign in to access your dashboard</h1>
      <p className="mt-2 text-fg-muted">Sign in from the header, then come back here to manage your company.</p>
    </div>
  )
}

function NoCompanyState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-fg">You don't manage a company yet</h1>
      <p className="mt-2 text-fg-muted">
        Create a business profile to start bidding for sponsored placement on Repcastr.
      </p>
      <Link to="/dashboard/new" className={buttonVariants({ className: 'mt-6' })}>
        <Plus className="h-4 w-4" /> Create your company
      </Link>
    </div>
  )
}

function DashboardWithCompany({ company }: { company: Company }) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-widest text-fg-subtle">Advertiser dashboard</p>
            <h1 className="text-2xl font-bold tracking-tight text-fg">{company.name}</h1>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Link to={`/companies/${company.slug}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ExternalLink className="h-3.5 w-3.5" /> View public profile
          </Link>
        </div>
      </div>

      <DashboardContent company={company} />
      <EditCompanyDialog company={company} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}

const DASHBOARD_TABS = ['overview', 'bids', 'deals', 'billing'] as const
type DashboardTab = (typeof DASHBOARD_TABS)[number]

function isDashboardTab(value: string | null): value is DashboardTab {
  return DASHBOARD_TABS.includes(value as DashboardTab)
}

function DashboardContent({ company }: { company: Company }) {
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  const allCompaniesQuery = useAllCompanies()
  // Lets the homepage "Create a deal" CTA (and any other future link) open
  // the dashboard directly on a specific tab via ?tab=deals — read once at
  // mount, same as every other "initial tab" pattern; the tab itself still
  // lives in local state afterward so clicking between tabs doesn't rewrite
  // the URL.
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<DashboardTab>(() => {
    const requested = searchParams.get('tab')
    return isDashboardTab(requested) ? requested : 'overview'
  })
  const placeBidMutation = usePlaceBid()
  const createBidPaymentMutation = useCreateBidPayment()

  // A company has at most one active bid, so there is only ever one
  // possible in-flight submission at a time — no per-placement key needed
  // anymore, just whether the one bid action is currently running.
  const [submittingBid, setSubmittingBid] = useState(false)

  const loading = placementsQuery.isLoading || bidsQuery.isLoading || allCompaniesQuery.isLoading
  const errored = placementsQuery.isError || bidsQuery.isError || allCompaniesQuery.isError

  if (loading) return <LoadingState label="Loading your bid…" />
  if (errored) return <ErrorState message="Couldn't load your bid." />

  const placements = placementsQuery.data ?? []
  const bids = bidsQuery.data ?? []
  const allCompanies = allCompaniesQuery.data ?? []
  const globalPlacement = getGlobalPlacement(placements)

  // Pure function of (bids, globalPlacementId, company.id) — deliberately
  // not memoized against a previous company's result, so switching
  // companies always recomputes from scratch (same guarantee the old
  // per-placement getMyPlacements made, now over a single global bid).
  const bidStatus = globalPlacement
    ? getGlobalBidStatus(bids, globalPlacement.id, company.id)
    : { ranked: [], myBid: undefined, outbid: false, leader: undefined }

  // currentAmount is null when this company has no bid yet (StartBidCard)
  // — see getBidSubmitDecision for why that also means "paid". `amount`
  // here is the TARGET bid the user wants, never a charge amount — the
  // server (create-bid-payment / place_bid) independently recomputes both
  // the free/paid decision and the exact charge from the database;
  // getBidSubmitDecision only decides which client path to call and what
  // to show while that's in flight.
  function handlePlaceBid(placementId: string, amount: number, currentAmount: number | null) {
    const decision = getBidSubmitDecision({ targetAmount: amount, currentActiveAmount: currentAmount })

    if (decision.action === 'invalid') {
      toast.error('Enter a valid bid amount.')
      return
    }

    // Advisory only — place_bid() rejects this exact case server-side too
    // (see supabase/migrations/20260822050000_reject_bid_lowering.sql), so
    // this early return is purely to skip a request that would fail
    // anyway. BidAdjustControl already disables its own submit button for
    // this case; this exists for any other caller of handlePlaceBid.
    // Repcastr bids are one-way commitments — there is no lowering and no
    // withdrawal, only raising or staying put.
    if (decision.action === 'rejected_lowering') {
      toast.error("Bids can't be lowered. If you want a higher position, increase your bid.")
      return
    }

    setSubmittingBid(true)

    if (decision.action === 'free_same') {
      placeBidMutation.mutate(
        { companyId: company.id, placementId, amount },
        {
          onSuccess: () => {
            toast.success(`Your bid stays at ${formatCurrency(amount)}`)
            setSubmittingBid(false)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Could not update your bid.')
            setSubmittingBid(false)
          },
        },
      )
      return
    }

    createBidPaymentMutation.mutate(
      { companyId: company.id, placementId, targetAmount: amount },
      {
        onSuccess: (checkoutUrl) => {
          // Left pending on purpose: the browser is about to navigate away
          // to Stripe Checkout, so the control stays showing its loading
          // state right up until the redirect actually happens.
          window.location.href = checkoutUrl
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not start payment.')
          setSubmittingBid(false)
        },
      },
    )
  }

  return (
    <Tabs value={tab} onValueChange={(value) => isDashboardTab(value) && setTab(value)} className="mt-8">
      <div className="overflow-x-auto">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bids">
            <span className="hidden sm:inline">My Bid &amp; Competitors</span>
            <span className="sm:hidden">Bid</span>
          </TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
        {!bidStatus.myBid && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-fg-muted">
            No active bid yet. Head to the "My Bid &amp; Competitors" tab when you're ready to start.
          </div>
        )}

        {bidStatus.myBid && bidStatus.outbid && bidStatus.leader && (
          <OutbidBanner
            placementName="Your sponsored bid"
            leaderName={allCompanies.find((c) => c.id === bidStatus.leader!.companyId)?.name ?? 'A competitor'}
            leaderBid={bidStatus.leader.amount}
            myBid={bidStatus.myBid.amount}
            onRaiseBid={() => setTab('bids')}
          />
        )}

        {bidStatus.myBid && (
          <div className="grid gap-4 sm:grid-cols-2">
            <PositionCard
              placementName="Your sponsored bid"
              rank={bidStatus.myBid.rank}
              totalSlots={bidStatus.ranked.length}
              bidAmount={bidStatus.myBid.amount}
              isOutbid={bidStatus.outbid}
            />
          </div>
        )}

        {company.categoryIds.length > 0 && (
          <p className="text-xs text-fg-subtle">
            {bidStatus.myBid
              ? 'This one bid is what makes you eligible for sponsored visibility in every category you belong to — raising or lowering it never touches your categories, and changing your categories never touches this bid.'
              : "You'll be eligible for sponsored visibility in every category you belong to as soon as you place a bid."}
          </p>
        )}
      </TabsContent>

      <TabsContent value="bids" className="mt-6 flex flex-col gap-8">
        {bidStatus.myBid ? (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-fg">Your sponsored bid</h3>
              <span className="font-numeral text-sm text-fg-muted">
                Rank #{bidStatus.myBid.rank} of {bidStatus.ranked.length}
              </span>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <CompetitorBidTable placementId={globalPlacement!.id} myCompanyId={company.id} />
              <BidAdjustControl
                currentAmount={bidStatus.myBid.amount}
                leaderAmount={bidStatus.leader?.amount ?? bidStatus.myBid.amount}
                submitting={submittingBid}
                onSubmit={(amount) => handlePlaceBid(globalPlacement!.id, amount, bidStatus.myBid!.amount)}
              />
            </div>
          </div>
        ) : globalPlacement ? (
          <StartBidCard
            placementName="Start your sponsored bid"
            leaderName={bidStatus.leader ? allCompanies.find((c) => c.id === bidStatus.leader!.companyId)?.name ?? null : null}
            leaderAmount={bidStatus.leader?.amount ?? 0}
            activeBidderCount={bidStatus.ranked.length}
            submitting={submittingBid}
            onSubmit={(amount) => handlePlaceBid(globalPlacement.id, amount, null)}
          />
        ) : (
          <ErrorState message="Sponsored bidding isn't set up yet." />
        )}
      </TabsContent>

      <TabsContent value="deals" className="mt-6">
        <CompanyDealsTab companyId={company.id} />
      </TabsContent>

      <TabsContent value="billing" className="mt-6">
        <BillingHistoryTab companyId={company.id} />
      </TabsContent>
    </Tabs>
  )
}
