import { useState } from 'react'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import type { Company } from '@/mocks/types'
import { CompanyAvatar } from '@/components/ui/avatar'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { useBattleVote } from './useBattleVote'
import { formatCompactNumber, cn } from '@/lib/utils'

interface VoteSplitBarProps {
  battleId: string
  companyA: Company
  companyB: Company
  votesA: number
  votesB: number
}

export function VoteSplitBar({ battleId, companyA, companyB, votesA, votesB }: VoteSplitBarProps) {
  const { votedA, votedB, vote, signedIn } = useBattleVote(battleId)
  const [authOpen, setAuthOpen] = useState(false)

  const total = votesA + votesB || 1
  const pctA = Math.round((votesA / total) * 100)
  const pctB = 100 - pctA
  const aLeading = votesA > votesB
  const bLeading = votesB > votesA

  function handleVote(side: 'a' | 'b') {
    if (!signedIn) {
      setAuthOpen(true)
      return
    }
    vote(side)
  }

  return (
    <div>
      <div className="relative flex items-stretch gap-3 sm:gap-4">
        <SideButton
          company={companyA}
          pct={pctA}
          votes={votesA}
          leading={aLeading}
          voted={votedA}
          onClick={() => handleVote('a')}
          align="left"
        />
        <div className="z-10 flex shrink-0 items-center">
          <span className="font-numeral flex h-11 w-11 items-center justify-center rounded-full border-2 border-border bg-bg text-sm text-fg-muted shadow-lg">
            VS
          </span>
        </div>
        <SideButton
          company={companyB}
          pct={pctB}
          votes={votesB}
          leading={bLeading}
          voted={votedB}
          onClick={() => handleVote('b')}
          align="right"
        />
      </div>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-surface-raised">
        <motion.div
          className="bg-organic"
          animate={{ width: `${pctA}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        <motion.div
          className="bg-brand"
          animate={{ width: `${pctB}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to vote"
        description="Create an account to help shape Repcastr's rankings."
      />
    </div>
  )
}

function SideButton({
  company,
  pct,
  votes,
  leading,
  voted,
  onClick,
  align,
}: {
  company: Company
  pct: number
  votes: number
  leading: boolean
  voted: boolean
  onClick: () => void
  align: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={cn(
        'group flex flex-1 flex-col gap-3 rounded-xl border p-4 text-left transition-all sm:flex-row sm:items-center',
        voted ? 'border-organic/50 bg-organic/10 shadow-glow-organic' : 'border-border bg-surface-raised hover:border-organic/30 hover:-translate-y-0.5',
        align === 'right' && 'sm:flex-row-reverse sm:text-right',
      )}
    >
      <div className={cn('flex items-center gap-3', align === 'right' && 'sm:flex-row-reverse')}>
        <CompanyAvatar initials={company.initials} color={company.logoColor} logoUrl={company.logoUrl} size="md" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-fg">
            {align === 'right' && leading && <Crown className="h-3.5 w-3.5 shrink-0 text-sponsored" />}
            <span className="truncate">{company.name}</span>
            {align === 'left' && leading && <Crown className="h-3.5 w-3.5 shrink-0 text-sponsored" />}
          </p>
          <p className="text-xs text-fg-muted">{formatCompactNumber(votes)} votes</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span className={cn('font-numeral text-3xl leading-none', leading ? 'text-organic' : 'text-fg-subtle')}>
          {pct}%
        </span>
      </div>
      <span
        className={cn(
          'inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
          voted
            ? 'bg-organic text-bg'
            : 'bg-surface text-fg-muted opacity-0 group-hover:opacity-100',
        )}
      >
        {voted ? 'Your vote' : 'Vote'}
      </span>
    </button>
  )
}
