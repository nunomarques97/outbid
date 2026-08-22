import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { cn, formatCompactNumber } from '@/lib/utils'
import { useCompanyVote } from '@/features/companies/useCompanyVote'
import { AuthDialog } from '@/features/auth/AuthDialog'

interface VoteButtonProps {
  companySlug: string
  baseVotes: number
  size?: 'sm' | 'md'
}

export function VoteButton({ companySlug, baseVotes, size = 'md' }: VoteButtonProps) {
  const { voted, count, toggle, signedIn } = useCompanyVote(companySlug, baseVotes)
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!signedIn) {
            setAuthOpen(true)
            return
          }
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
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to vote"
        description="Create an account to help shape Repcastr's rankings."
      />
    </>
  )
}
