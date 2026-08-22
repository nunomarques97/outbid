import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { Company } from '@/mocks/types'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompanies, useCategories, usePlacements, useActiveBids, useAllCompanies } from '@/lib/supabase/hooks'
import { getPlacementDisplayName } from '@/lib/supabase/queries'
import { usePlaceBid, useWithdrawBid } from '@/features/dashboard/useDashboardBids'
import { getRankedBids, isCompanyOutbid } from '@/lib/ranking'
import { CompanyAvatar } from '@/components/ui/avatar'
import { CompanySwitcher } from '@/features/companies/CompanySwitcher'
import { EditCompanyDialog } from '@/features/companies/EditCompanyDialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PositionCard } from '@/features/dashboard/PositionCard'
import { OutbidBanner } from '@/features/dashboard/OutbidBanner'
import { CompetitorBidTable } from '@/features/dashboard/CompetitorBidTable'
import { BidAdjustControl } from '@/features/dashboard/BidAdjustControl'
import { StartBidCard } from '@/features/dashboard/StartBidCard'
import { CompanyDealsTab } from '@/features/dashboard/CompanyDealsTab'
import { LoadingState, ErrorState } from '@/components/shared/QueryStates'
import { formatCurrency } from '@/lib/utils'

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const myCompaniesQuery = useMyCompanies()

  if (authLoading) return <LoadingState label="Loading your dashboard…" />
  if (!user) return <SignedOutState />

  // isPending (not isLoading) deliberately: this query starts disabled until
  // `user` exists, so isLoading can read false for a render or two right as
  // it flips enabled — isPending stays accurate ("no data yet") regardless.
  if (myCompaniesQuery.isPending) return <LoadingState label="Loading your dashboard…" />
  if (myCompaniesQuery.isError) return <ErrorState message="Couldn't load your companies." />

  if (myCompaniesQuery.data.length === 0) return <NoCompanyState />

  return <DashboardWithCompanySelection companies={myCompaniesQuery.data} />
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
        Create a business profile to start bidding for sponsored placement on Outbid.
      </p>
      <Link to="/dashboard/new" className={buttonVariants({ className: 'mt-6' })}>
        <Plus className="h-4 w-4" /> Create your company
      </Link>
    </div>
  )
}

/**
 * Owns which of the signed-in user's companies is currently selected.
 * Supabase (via useMyCompanies) remains the source of truth for which
 * companies exist and what's on them — this only tracks a UI selection, and
 * defaults back to the first company whenever the previously-selected one is
 * no longer present (e.g. it was the very first render).
 */
function DashboardWithCompanySelection({ companies }: { companies: Company[] }) {
  const [selectedId, setSelectedId] = useState(companies[0].id)
  const company = companies.find((c) => c.id === selectedId) ?? companies[0]
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
        <div className="flex items-center gap-2">
          <CompanySwitcher companies={companies} selectedId={company.id} onSelect={setSelectedId} />
          <Link to="/dashboard/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Plus className="h-3.5 w-3.5" /> New company
          </Link>
        </div>
      </div>

      {/* key={company.id} forces a full remount on switch — without it, a
          child like BidAdjustControl could keep stale local slider state
          across companies if two companies happen to share a bid on the
          same placement.id, since React would otherwise reuse the same
          keyed list-item instance. Also resets EditCompanyDialog's pending
          logo selection so a half-picked file can never carry over to a
          different company after switching. */}
      <DashboardContent key={company.id} company={company} />
      <EditCompanyDialog key={company.id} company={company} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  )
}

function DashboardContent({ company }: { company: Company }) {
  const categoriesQuery = useCategories()
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  const allCompaniesQuery = useAllCompanies()
  const [tab, setTab] = useState('overview')
  const placeBidMutation = usePlaceBid()
  const withdrawBidMutation = useWithdrawBid()

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

  const myPlacements = placements
    .map((placement) => {
      const ranked = getRankedBids(bids, placement.id)
      const myBid = ranked.find((b) => b.companyId === company.id)
      if (!myBid) return null
      const outbid = isCompanyOutbid(bids, placement.id, company.id)
      const leader = ranked[0]
      return { placement, myBid, ranked, outbid, leader }
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  const outbidPlacements = myPlacements.filter((p) => p.outbid)

  // Placements this company isn't bidding on at all yet — everything else
  // is already derived from placements/bids already fetched above, so this
  // needs no additional query.
  const myPlacementIds = new Set(myPlacements.map((p) => p.placement.id))
  const availablePlacements = placements
    .filter((placement) => !myPlacementIds.has(placement.id))
    .map((placement) => {
      const ranked = getRankedBids(bids, placement.id)
      const leader = ranked[0] as (typeof ranked)[number] | undefined
      return { placement, ranked, leader }
    })

  function handlePlaceBid(placementId: string, name: string, amount: number) {
    placeBidMutation.mutate(
      { companyId: company.id, placementId, amount },
      {
        onSuccess: () => toast.success(`You're now bidding ${formatCurrency(amount)} on ${name}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update your bid.'),
      },
    )
  }

  function handleWithdrawBid(placementId: string, name: string) {
    withdrawBidMutation.mutate(
      { companyId: company.id, placementId },
      {
        onSuccess: () => toast.success(`Withdrew your bid from ${name}`),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not withdraw your bid.'),
      },
    )
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="mt-8">
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
                  submitting={placeBidMutation.isPending}
                  withdrawing={withdrawBidMutation.isPending}
                  onSubmit={(amount) => handlePlaceBid(p.placement.id, name, amount)}
                  onWithdraw={() => handleWithdrawBid(p.placement.id, name)}
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
                    submitting={placeBidMutation.isPending}
                    onSubmit={(amount) => handlePlaceBid(placement.id, name, amount)}
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
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center">
          <p className="font-semibold text-fg">Billing is coming soon</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-fg-muted">
            Invoices and spend history will appear here once payments are set up. Bidding and deals are unaffected —
            there's nothing to pay yet.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  )
}
