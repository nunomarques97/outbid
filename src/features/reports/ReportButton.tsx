import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { cn } from '@/lib/utils'
import type { ReportTargetType } from '@/lib/supabase/mutations'
import { ReportDialog } from './ReportDialog'

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
  className?: string
  /** Show the "Report" text next to the flag icon — off by default for tight spaces like a card footer. */
  withLabel?: boolean
}

/** Same sign-in-gate pattern as VoteButton/SaveButton: signed out opens AuthDialog instead of the action itself. */
export function ReportButton({ targetType, targetId, className, withLabel }: ReportButtonProps) {
  const { user, isConfigured } = useAuth()
  const signedIn = isConfigured && Boolean(user)
  const [authOpen, setAuthOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

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
          setReportOpen(true)
        }}
        className={cn(
          'inline-flex items-center gap-1 text-xs text-fg-subtle transition-colors hover:text-danger',
          className,
        )}
      >
        <Flag className="h-3 w-3" />
        {withLabel && 'Report'}
      </button>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to report"
        description="Sign in so we know who to follow up with if we need more detail."
      />
      {signedIn && (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType={targetType} targetId={targetId} />
      )}
    </>
  )
}
