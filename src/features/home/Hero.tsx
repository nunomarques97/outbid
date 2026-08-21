import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, TrendingUp } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { CompanyAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

const previewRows = [
  { rank: 1, name: 'Corestack Hosting', initials: 'CS', color: '#3A86FF', bid: 910, sponsored: true },
  { rank: 2, name: 'Nimbus Cloud', initials: 'NC', color: '#8338EC', bid: 680, sponsored: true },
  { rank: 3, name: 'Anchorpoint Hosting', initials: 'AP', color: '#EF476F', bid: 430, sponsored: true },
]

export function Hero() {
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
            Outbid ranks companies by real user votes, then lets businesses bid — openly, in
            euros — for extra visibility. Every sponsored spot is labeled. Every bid is public.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/categories" className={buttonVariants({ size: 'lg' })}>
              Explore rankings <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/dashboard" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              For Businesses
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-fg-muted">
            <span><strong className="font-numeral text-fg">19</strong> companies ranked</span>
            <span><strong className="font-numeral text-fg">4</strong> categories</span>
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
            <p className="text-xs font-bold uppercase tracking-widest text-fg-muted">Best Web Hosting</p>
            <span className="flex items-center gap-1.5 text-xs text-sponsored">
              <span className="h-1.5 w-1.5 rounded-full bg-sponsored" /> Sponsored
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {previewRows.map((row, i) => (
              <motion.div
                key={row.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 rounded-lg border border-sponsored/25 bg-surface-raised p-3 shadow-glow-gold"
              >
                <span className="font-numeral w-4 text-center text-sponsored">{row.rank}</span>
                <CompanyAvatar initials={row.initials} color={row.color} size="sm" />
                <span className="flex-1 truncate text-sm font-medium text-fg">{row.name}</span>
                <span className="font-numeral text-sm text-sponsored">{formatCurrency(row.bid)}</span>
              </motion.div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-fg-subtle">
            Higher bid, higher position. If a competitor outbids them tomorrow, this order
            changes — live.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
