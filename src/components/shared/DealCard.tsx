import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Clock, Check } from 'lucide-react'
import type { Deal, Company } from '@/mocks/types'
import { useCategories, useMyCompanies } from '@/lib/supabase/hooks'
import { useAuth } from '@/features/auth/useAuth'
import { useMyWatchedDealIds, useWatchDeal, useUnwatchDeal } from '@/features/deals/useWatchedDeals'
import { getDealCtaState } from '@/lib/dealState'
import { CompanyAvatar } from '@/components/ui/avatar'
import { CompanyWebsiteLink } from '@/components/shared/CompanyWebsiteLink'
import { Button } from '@/components/ui/button'
import { formatCompactNumber, cn } from '@/lib/utils'

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function isExpired(iso: string) {
  return new Date(iso).getTime() <= Date.now()
}

export function DealCard({ deal, company }: { deal: Deal; company: Company }) {
  const { user, isConfigured } = useAuth()
  const signedIn = isConfigured && Boolean(user)
  const left = daysLeft(deal.expiresAt)
  const expired = isExpired(deal.expiresAt)
  // A deal-specific landing page if the advertiser set one, otherwise the
  // company's own site — Outbid never invents a destination.
  const destinationWebsite = deal.destinationUrl || company.website

  const { data: categories = [] } = useCategories()
  const category = categories.find((c) => company.categoryIds.includes(c.id))

  const watchedIdsQuery = useMyWatchedDealIds()
  const watchMutation = useWatchDeal()
  const unwatchMutation = useUnwatchDeal()
  const watching = watchedIdsQuery.data?.includes(deal.id) ?? false

  // Mirrors CompanyReviewsSection's self-review guard: proactively hides
  // the watch action for a company's own members rather than letting them
  // hit the RLS rejection this would otherwise produce — deal_claims'
  // insert policy blocks this at the database level regardless.
  const myCompaniesQuery = useMyCompanies()
  const managesThisCompany = Boolean(myCompaniesQuery.data?.some((c) => c.id === company.id))

  const ctaState = getDealCtaState({ expired, signedIn, managesCompany: managesThisCompany, watching })
  const watchPending = watchMutation.isPending || unwatchMutation.isPending

  function handleToggleWatch() {
    if (!signedIn) {
      toast.error('Sign in to watch this deal', { description: 'Sign in from the header, then come back to watch it.' })
      return
    }
    if (watching) {
      unwatchMutation.mutate(deal.id, { onSuccess: () => toast.success('Removed from watched deals.') })
      return
    }
    watchMutation.mutate(deal.id, {
      onSuccess: () => toast.success(`Watching ${deal.title}`, { description: `at ${company.name}` }),
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-surface p-4 transition-colors hover:border-organic/30',
        ctaState === 'watching' ? 'border-organic/30' : 'border-border',
      )}
    >
      <div className="mb-3 flex items-center gap-3">
        <Link to={`/companies/${company.slug}`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
          <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg hover:underline">{company.name}</p>
            <p className="truncate text-xs text-fg-subtle">
              {category?.name} · {formatCompactNumber(deal.claimCount)} watching
            </p>
          </div>
        </Link>
        <span className="ml-auto shrink-0 rounded-full bg-organic/15 px-2.5 py-1 text-xs font-bold text-organic">
          {deal.discountLabel}
        </span>
      </div>
      <p className="font-semibold leading-snug text-fg">{deal.title}</p>
      <p className="mt-1.5 flex-1 text-sm text-fg-muted">{deal.description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1 text-xs text-fg-subtle">
          <Clock className="h-3.5 w-3.5" />
          {expired ? 'Expired' : left > 0 ? `Ends in ${left}d` : 'Ends today'}
        </span>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {/* Outbid shows the offer and sends the customer to it — it never
              redeems or validates anything itself. This link is available
              regardless of watch/auth state, since it's public information,
              not something watching unlocks. */}
          <CompanyWebsiteLink website={destinationWebsite} size="sm">
            Visit deal
          </CompanyWebsiteLink>

          {ctaState === 'expired' && (
            <Button size="sm" variant="secondary" disabled>
              Expired
            </Button>
          )}
          {ctaState === 'own' && (
            <Button size="sm" variant="secondary" disabled title="You manage this company">
              Your deal
            </Button>
          )}
          {ctaState === 'watching' && (
            <Button size="sm" variant="secondary" disabled={watchPending} onClick={handleToggleWatch} className="text-organic">
              <Check className="h-3.5 w-3.5" /> {watchPending ? 'Removing…' : 'Watched'}
            </Button>
          )}
          {ctaState === 'signedOut' && (
            <Button size="sm" variant="primary" onClick={handleToggleWatch}>
              Sign in to watch
            </Button>
          )}
          {ctaState === 'watchable' && (
            <Button size="sm" variant="primary" disabled={watchPending} onClick={handleToggleWatch}>
              {watchPending ? 'Watching…' : 'Watch deal'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
