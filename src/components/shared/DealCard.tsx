import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Clock, Check } from 'lucide-react'
import type { Deal, Company } from '@/mocks/types'
import { useCategories } from '@/lib/supabase/hooks'
import { CompanyAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatCompactNumber, cn } from '@/lib/utils'

function daysLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function DealCard({ deal, company }: { deal: Deal; company: Company }) {
  const [claimed, setClaimed] = useState(false)
  const left = daysLeft(deal.expiresAt)
  const { data: categories = [] } = useCategories()
  const category = categories.find((c) => company.categoryIds.includes(c.id))

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-organic/30">
      <div className="mb-3 flex items-center gap-3">
        <Link to={`/companies/${company.slug}`} className="flex min-w-0 items-center gap-3 hover:opacity-90">
          <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg hover:underline">{company.name}</p>
            <p className="truncate text-xs text-fg-subtle">
              {category?.name} · {formatCompactNumber(deal.claimCount)} claimed
            </p>
          </div>
        </Link>
        <span className="ml-auto shrink-0 rounded-full bg-organic/15 px-2.5 py-1 text-xs font-bold text-organic">
          {deal.discountLabel}
        </span>
      </div>
      <p className="font-semibold leading-snug text-fg">{deal.title}</p>
      <p className="mt-1.5 flex-1 text-sm text-fg-muted">{deal.description}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-1 text-xs text-fg-subtle">
          <Clock className="h-3.5 w-3.5" />
          {left > 0 ? `Ends in ${left}d` : 'Ends today'}
        </span>
        <Button
          size="sm"
          variant={claimed ? 'secondary' : 'primary'}
          disabled={claimed}
          onClick={() => {
            setClaimed(true)
            toast.success(`Deal claimed at ${company.name}`, {
              description: deal.title,
            })
          }}
          className={cn(claimed && 'text-organic')}
        >
          {claimed ? (
            <>
              <Check className="h-3.5 w-3.5" /> Claimed
            </>
          ) : (
            'Claim deal'
          )}
        </Button>
      </div>
    </div>
  )
}
