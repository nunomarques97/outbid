import { Link, useLocation } from 'react-router-dom'
import { Bookmark } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { cn } from '@/lib/utils'

/**
 * A persistent header shortcut to /saved, mirroring NotificationBell's own
 * "self-gate on signed-in-ness" shape — saved companies are meaningful to
 * every signed-in customer immediately (unlike notifications, which only
 * matter to advertisers), so this shows for any signed-in user with no
 * further gating.
 */
export function SavedLink() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return null

  const active = location.pathname === '/saved'

  return (
    <Link
      to="/saved"
      aria-label="Saved companies"
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
        active ? 'border-brand/40 bg-brand/15 text-brand' : 'border-border bg-surface-raised text-fg-muted hover:text-fg',
      )}
    >
      <Bookmark className="h-4 w-4" fill={active ? 'currentColor' : 'none'} />
    </Link>
  )
}
