import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { Company } from '@/mocks/types'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompany, useCategories, usePlacements, useActiveBids, useAllCompanies } from '@/lib/supabase/hooks'
import { getPlacementDisplayName } from '@/lib/supabase/queries'
import { usePlaceBid, useCreateBidPayment } from '@/features/dashboard/useDashboardBids'
import { getBidSubmitDecision } from '@/lib/bidPayment'
import { getMyPlacements, getAvailablePlacements } from '@/lib/ranking'
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
  const categoriesQuery = useCategories()
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

  // Which single placement is currently in-flight — placeBidMutation/
  // createBidPaymentMutation are each one shared mutation instance reused
  // across every placement's card, so their own `isPending` is true for
  // ALL cards at once while either is running. This scopes the loading
  // state to only the specific card the user actually clicked. No
  // separate action discriminator needed — placing a bid is the only
  // mutating action left (no withdrawal).
  const [pendingPlacementId, setPendingPlacementId] = useState<string | null>(null)

  const loading =
    categoriesQuery.isLoading || placementsQuery.isLoading || bidsQuery.isLoading || allCompaniesQuery.isLoading
  const errored =
    categoriesQuery.isError || placementsQuery.isError || bidsQuery.isError || allCompaniesQuery.isError

  if (loading) return <LoadingState label="Loading your placements…" />
  if (errored) return <ErrorState message="Couldn't load your placements." />

  const categories = categoriesQuery.data ?? []
  const placements = placementsQuery.data ?? []
  const bids = bidsQuery.data ?? []
  const allCompanies = allCompaniesQuery.data ?? []

  // Both pure functions of (bids, placements, company.id) — see
  // getMyPlacements' own doc comment for why this is deliberately not
  // memoized against the previous company's result: a switch must always
  // recompute from scratch, never carry over a stale derived value.
  const myPlacements = getMyPlacements(bids, placements, company.id)
  const outbidPlacements = myPlacements.filter((p) => p.outbid)
  const availablePlacements = getAvailablePlacements(bids, placements, company.id)

  // currentAmount is null for a placement this company isn't bidding on
  // yet (StartBidCard) — see getBidSubmitDecision for why that also means
  // "paid". `amount` here is the TARGET bid the user wants, never a charge
  // amount — the server (create-bid-payment / place_bid) independently
  // recomputes both the free/paid decision and the exact charge from the
  // database; getBidSubmitDecision only decides which client path to call
  // and what to show while that's in flight.
  function handlePlaceBid(placementId: string, name: string, amount: number, currentAmount: number | null) {
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

    setPendingPlacementId(placementId)

    if (decision.action === 'free_same') {
      placeBidMutation.mutate(
        { companyId: company.id, placementId, amount },
        {
          onSuccess: () => {
            toast.success(`Your bid on ${name} stays at ${formatCurrency(amount)}`)
            setPendingPlacementId(null)
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Could not update your bid.')
            setPendingPlacementId(null)
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
          // to Stripe Checkout, so this placement should stay showing its
          // loading state right up until the redirect actually happens.
          window.location.href = checkoutUrl
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not start payment.')
          setPendingPlacementId(null)
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
            <span className="hidden sm:inline">My Bids &amp; Competitors</span>
            <span className="sm:hidden">Bids</span>
          </TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-6 flex flex-col gap-6">
        {myPlacements.length > 0 && (
          <p className="text-sm text-fg-muted">
            <span className="font-numeral text-fg">{myPlacements.length}</span> active placement
            {myPlacements.length === 1 ? '' : 's'} ·{' '}
            <span className="font-numeral text-sponsored">{myPlacements.length - outbidPlacements.length} leading</span>
            {outbidPlacements.length > 0 && (
              <>
                {' '}
                · <span className="font-numeral text-danger">{outbidPlacements.length} outbid</span>
              </>
            )}
          </p>
        )}

        {myPlacements.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-fg-muted">
            No active placements yet. Head to the "My Bids &amp; Competitors" tab once you're ready to bid on one.
          </div>
        )}

        {outbidPlacements.map((p) => (
          <OutbidBanner
            key={p.placement.id}
            placementName={getPlacementDisplayName(p.placement, categories)}
            leaderName={allCompanies.find((c) => c.id === p.leader.companyId)?.name ?? 'A competitor'}
            leaderBid={p.leader.amount}
            myBid={p.myBid.amount}
            onRaiseBid={() => setTab('bids')}
          />
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          {myPlacements.map((p) => (
            <PositionCard
              key={p.placement.id}
              placementName={getPlacementDisplayName(p.placement, categories)}
              rank={p.myBid.rank}
              totalSlots={p.placement.maxSponsoredSlots}
              bidAmount={p.myBid.amount}
              isOutbid={p.outbid}
            />
          ))}
        </div>
      </TabsContent>

      <TabsContent value="bids" className="mt-6 flex flex-col gap-8">
        {myPlacements.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-fg-muted">
            You're not bidding on any placements yet — start below.
          </div>
        )}
        {myPlacements.map((p) => {
          const name = getPlacementDisplayName(p.placement, categories)
          return (
            <div key={p.placement.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-fg">{name}</h3>
                <span className="font-numeral text-sm text-fg-muted">
                  Rank #{p.myBid.rank} of {p.ranked.length}
                </span>
              </div>
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <CompetitorBidTable placementId={p.placement.id} myCompanyId={company.id} />
                <BidAdjustControl
                  currentAmount={p.myBid.amount}
                  leaderAmount={p.leader.amount}
                  submitting={pendingPlacementId === p.placement.id}
                  onSubmit={(amount) => handlePlaceBid(p.placement.id, name, amount, p.myBid.amount)}
                />
              </div>
            </div>
          )
        })}

        {availablePlacements.length > 0 && (
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-fg-muted">
              Available placements
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {availablePlacements.map(({ placement, ranked, leader }) => {
                const name = getPlacementDisplayName(placement, categories)
                const leaderCompany = leader ? allCompanies.find((c) => c.id === leader.companyId) : undefined
                return (
                  <StartBidCard
                    key={placement.id}
                    placementName={name}
                    leaderName={leaderCompany?.name ?? null}
                    leaderAmount={leader?.amount ?? 0}
                    activeBidderCount={ranked.length}
                    maxSponsoredSlots={placement.maxSponsoredSlots}
                    submitting={pendingPlacementId === placement.id}
                    onSubmit={(amount) => handlePlaceBid(placement.id, name, amount, null)}
                  />
                )
              })}
            </div>
          </div>
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
