import { ChevronUp } from 'lucide-react'
import { cn, formatCompactNumber } from '@/lib/utils'
import { useCompanyVote } from '@/features/companies/useCompanyVote'

interface VoteButtonProps {
  companyId: string
  companySlug: string
  baseVotes: number
  size?: 'sm' | 'md'
}

export function VoteButton({ companyId, companySlug, baseVotes, size = 'md' }: VoteButtonProps) {
  const { voted, count, toggle } = useCompanyVote(companyId, companySlug, baseVotes)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle()
      }}
      aria-pressed={voted}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors',
        voted
          ? 'border-organic/40 bg-organic/15 text-organic'
          : 'border-border bg-surface-raised text-fg-muted hover:border-organic/30 hover:text-organic',
        size === 'sm' ? 'h-11 w-11' : 'h-14 w-14',
      )}
    >
      <ChevronUp className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      <span className={cn('font-numeral leading-none', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {formatCompactNumber(count)}
      </span>
    </button>
  )
}
