import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp, Shuffle, ChevronDown, ChevronUp, Rocket } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { CompanyAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CompanyExternalLinkButton } from '@/components/shared/CompanyExternalLinkButton'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { useAllCompanies, useCategories, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { getTopBidders, type TopBidderEntry } from '@/lib/ranking'
import { formatCurrency } from '@/lib/utils'
import { useBidCta } from './useBidCta'

const HERO_STATIC_COUNT = 3
const HERO_MARQUEE_MAX = 20

/**
 * Purely decorative — abstract bar heights suggesting a competitive
 * leaderboard behind the Top Bidders panel. Never real bid amounts (no
 * numbers are shown, no company is implied), just a visual echo of
 * "companies ranked by height" that ties the background to what the panel
 * in front of it is actually showing.
 */
const RANKING_BAR_HEIGHTS = [28, 44, 34, 56, 40, 64, 30, 48]

export function Hero() {
  const navigate = useNavigate()
  const companiesQuery = useAllCompanies()
  const categoryCount = useCategories().data?.length
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()
  const [expanded, setExpanded] = useState(false)
  const bidCta = useBidCta()

  const companies = companiesQuery.data ?? []
  const globalPlacement = getGlobalPlacement(placementsQuery.data ?? [])
  const allTopBidders = globalPlacement
    ? getTopBidders(companies, bidsQuery.data ?? [], globalPlacement.id).slice(0, HERO_MARQUEE_MAX)
    : []
  const staticTop = allTopBidders.slice(0, HERO_STATIC_COUNT)
  const marqueeRest = allTopBidders.slice(HERO_STATIC_COUNT)

  function handleRateRandomCompany() {
    if (companies.length === 0) return
    const random = companies[Math.floor(Math.random() * companies.length)]
    navigate(`/companies/${random.slug}`)
  }

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/*
          Two decorative treatments, both always rendered — index.css picks
          one via the `data-style` attribute the style toggle sets on <html>.
          Nothing here branches on style in JS.
        */}
        <div className="hero-decor-legacy absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand/20 via-sponsored/10 to-transparent blur-3xl" />
        <div className="hero-decor-legacy absolute bottom-0 right-[4%] hidden items-end gap-2.5 opacity-[0.14] lg:flex">
          {RANKING_BAR_HEIGHTS.map((h, i) => (
            <motion.div
              key={i}
              className="w-3.5 rounded-t-full bg-gradient-to-t from-brand to-sponsored"
              style={{ height: h }}
              animate={{ height: [h, h * 1.2, h] }}
              transition={{ duration: 3.5 + i * 0.25, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            />
          ))}
        </div>

        {/* New style — a thin radar-target ring and a slow scanline sweep, standing in for the old blurred gradient glow. Crisp lines, no blur/fill. */}
        <div
          className="hero-decor-new absolute -right-24 -top-24 h-[34rem] w-[34rem] rounded-full border border-sponsored/25 opacity-60"
          aria-hidden="true"
        />
        <div
          className="hero-decor-new absolute -right-24 -top-24 h-[34rem] w-[34rem] translate-x-[3rem] translate-y-[3rem] rounded-full border border-sponsored/15 opacity-60"
          aria-hidden="true"
        />
        <div className="hero-decor-new absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sponsored/50 to-transparent" />
        <div
          className="hero-decor-new hero-decor-new-scanline absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-organic/[0.05] to-transparent"
          aria-hidden="true"
        />
        <div className="hero-decor-new absolute bottom-0 right-[4%] hidden items-end gap-2.5 opacity-[0.14] lg:flex">
          {RANKING_BAR_HEIGHTS.map((h, i) => (
            <motion.div
              key={i}
              className="w-3.5 bg-sponsored"
              style={{ height: h }}
              animate={{ height: [h, h * 1.2, h] }}
              transition={{ duration: 3.5 + i * 0.25, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
      <div className="hero-grid relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="hero-title">
          <Badge variant="brand" className="mb-5">
            <TrendingUp className="h-3 w-3" /> Live rankings, updated daily
          </Badge>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-5xl md:text-6xl">
            <span className="sm:hidden">Watch companies fight for the spotlight.</span>
            <span className="hidden sm:inline">
              Discover what’s actually worth your time — and watch companies fight for the spotlight.
            </span>
          </h1>
          <p className="mt-5 hidden max-w-xl text-lg text-fg-muted sm:block">
            Repcastr ranks companies by real user votes, then lets businesses bid — openly, in
            euros — for extra visibility. Every sponsored spot is labeled. Every bid is public.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="hero-panel rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/40"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-fg-muted">Top bidders</p>
            <span className="flex items-center gap-1.5 text-xs text-sponsored">
              <span className="h-1.5 w-1.5 rounded-full bg-sponsored" /> Sponsored
            </span>
          </div>
          {staticTop.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">No sponsored bidders yet — be the first.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2.5">
                {staticTop.map((entry, i) => (
                  <motion.div
                    key={entry.company.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                    className="flex items-center gap-3 rounded-lg border border-sponsored/25 bg-surface-raised p-3 shadow-glow-gold"
                  >
                    <BidderRow entry={entry} />
                  </motion.div>
                ))}
              </div>

              {marqueeRest.length > 0 && !expanded && (
                <div className="relative mt-2.5 h-[136px] overflow-hidden">
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-surface to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-surface to-transparent" />
                  <motion.div
                    className="flex flex-col gap-2.5"
                    animate={{ y: ['0%', '-50%'] }}
                    transition={{ duration: marqueeRest.length * 2.2, repeat: Infinity, ease: 'linear' }}
                  >
                    {[...marqueeRest, ...marqueeRest].map((entry, i) => (
                      <div
                        key={`${entry.company.id}-${i}`}
                        className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/60 p-2.5"
                      >
                        <BidderRow entry={entry} compact />
                      </div>
                    ))}
                  </motion.div>
                </div>
              )}

              {expanded && marqueeRest.length > 0 && (
                <div className="mt-2.5 flex max-h-[280px] flex-col gap-2.5 overflow-y-auto pr-1">
                  {marqueeRest.map((entry) => (
                    <div
                      key={entry.company.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/60 p-2.5"
                    >
                      <BidderRow entry={entry} compact />
                    </div>
                  ))}
                </div>
              )}

              {marqueeRest.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Show all {allTopBidders.length} <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </>
          )}
          <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
            Higher bid, higher position. If a competitor outbids them tomorrow, this order
            changes — live.
          </p>
        </motion.div>

        <div className="hero-buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/categories" className={buttonVariants({ size: 'lg' })}>
              Explore rankings <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/dashboard" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              For Businesses
            </Link>
            <Button type="button" variant="sponsored" size="lg" onClick={bidCta.handleClick}>
              <Rocket className="h-4 w-4" /> Bid for placement
            </Button>
            <button
              type="button"
              onClick={handleRateRandomCompany}
              disabled={companies.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-50"
            >
              <Shuffle className="h-3.5 w-3.5" /> Rate a random company
            </button>
          </div>

          <AuthDialog
            open={bidCta.authOpen}
            onOpenChange={bidCta.setAuthOpen}
            title="Sign in to bid for placement"
            description="Sign in or create an account, then set up your company to start bidding on Repcastr."
          />
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-fg-muted">
            {companiesQuery.data !== undefined && (
              <span><strong className="font-numeral text-fg">{companies.length}</strong> companies ranked</span>
            )}
            {categoryCount !== undefined && (
              <span><strong className="font-numeral text-fg">{categoryCount}</strong> categories</span>
            )}
            <span><strong className="font-numeral text-fg">100%</strong> transparent bids</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function BidderRow({ entry, compact }: { entry: TopBidderEntry; compact?: boolean }) {
  return (
    <>
      <span className={`font-numeral w-4 shrink-0 text-center ${compact ? 'text-fg-subtle' : 'text-sponsored'}`}>{entry.bid.rank}</span>
      <Link to={`/companies/${entry.company.slug}`} className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-90">
        <CompanyAvatar initials={entry.company.initials} color={entry.company.logoColor} logoUrl={entry.company.logoUrl} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{entry.company.name}</span>
      </Link>
      <CompanyExternalLinkButton website={entry.company.website} companyName={entry.company.name} className="h-6 w-6" />
      <span className={`font-numeral shrink-0 text-sm ${compact ? 'text-fg-muted' : 'text-sponsored'}`}>{formatCurrency(entry.bid.amount)}</span>
    </>
  )
}
