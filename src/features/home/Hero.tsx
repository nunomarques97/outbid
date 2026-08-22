import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp, Shuffle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { CompanyAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAllCompanies, useCategories, usePlacements, useActiveBids } from '@/lib/supabase/hooks'
import { getGlobalPlacement } from '@/lib/supabase/queries'
import { getTopBidders } from '@/lib/ranking'
import { formatCurrency } from '@/lib/utils'

const HERO_TOP_BIDDER_COUNT = 3

export function Hero() {
  const navigate = useNavigate()
  const companiesQuery = useAllCompanies()
  const categoryCount = useCategories().data?.length
  const placementsQuery = usePlacements()
  const bidsQuery = useActiveBids()

  const companies = companiesQuery.data ?? []
  const globalPlacement = getGlobalPlacement(placementsQuery.data ?? [])
  const topBidders = globalPlacement
    ? getTopBidders(companies, bidsQuery.data ?? [], globalPlacement.id).slice(0, HERO_TOP_BIDDER_COUNT)
    : []

  function handleRateRandomCompany() {
    if (companies.length === 0) return
    const random = companies[Math.floor(Math.random() * companies.length)]
    navigate(`/companies/${random.slug}`)
  }

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Badge variant="brand" className="mb-5">
            <TrendingUp className="h-3 w-3" /> Live rankings, updated daily
          </Badge>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-5xl md:text-6xl">
            Discover what’s actually worth your time — and watch companies fight for the spotlight.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-fg-muted">
            Repcastr ranks companies by real user votes, then lets businesses bid — openly, in
            euros — for extra visibility. Every sponsored spot is labeled. Every bid is public.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/categories" className={buttonVariants({ size: 'lg' })}>
              Explore rankings <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/dashboard" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              For Businesses
            </Link>
            <button
              type="button"
              onClick={handleRateRandomCompany}
              disabled={companies.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-50"
            >
              <Shuffle className="h-3.5 w-3.5" /> Rate a random company
            </button>
          </div>
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/40"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-fg-muted">Top bidders</p>
            <span className="flex items-center gap-1.5 text-xs text-sponsored">
              <span className="h-1.5 w-1.5 rounded-full bg-sponsored" /> Sponsored
            </span>
          </div>
          {topBidders.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">No sponsored bidders yet — be the first.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topBidders.map((entry, i) => (
                <motion.div
                  key={entry.company.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3 rounded-lg border border-sponsored/25 bg-surface-raised p-3 shadow-glow-gold"
                >
                  <span className="font-numeral w-4 text-center text-sponsored">{entry.bid.rank}</span>
                  <CompanyAvatar initials={entry.company.initials} color={entry.company.logoColor} logoUrl={entry.company.logoUrl} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium text-fg">{entry.company.name}</span>
                  <span className="font-numeral text-sm text-sponsored">{formatCurrency(entry.bid.amount)}</span>
                </motion.div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
            Higher bid, higher position. If a competitor outbids them tomorrow, this order
            changes — live.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
