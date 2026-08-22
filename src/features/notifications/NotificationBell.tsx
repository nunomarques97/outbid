import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, AlertTriangle } from 'lucide-react'
import type { Company } from '@/mocks/types'
import { useAuth } from '@/features/auth/useAuth'
import { usePlacements, useCategories, useAllCompanies, useMyCompanies } from '@/lib/supabase/hooks'
import { getPlacementDisplayName, type Notification } from '@/lib/supabase/queries'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from './useNotifications'
import { CompanyAvatar } from '@/components/ui/avatar'
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils'

/**
 * Notifications are advertiser-only content (outbid alerts on a company's
 * bids) — a signed-in customer who doesn't manage any company would only
 * ever see an empty "You're all caught up" bell, which is advertiser
 * furniture with no purpose for them. Gated on actually managing at least
 * one company, not just being signed in, so it stays out of pure-customer
 * navigation entirely.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const myCompaniesQuery = useMyCompanies()
  if (!user) return null
  if (myCompaniesQuery.isPending || (myCompaniesQuery.data?.length ?? 0) === 0) return null
  return <NotificationBellContent />
}

function NotificationBellContent() {
  const [open, setOpen] = useState(false)
  const notificationsQuery = useNotifications()
  const placementsQuery = usePlacements()
  const categoriesQuery = useCategories()
  const companiesQuery = useAllCompanies()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = notificationsQuery.data ?? []
  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-fg-muted hover:text-fg"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 max-h-[28rem] w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {unreadCount > 0 && notificationsQuery.companyIds.length > 0 && (
              <button
                type="button"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate(notificationsQuery.companyIds)}
                className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {notificationsQuery.isLoading && <p className="p-4 text-sm text-fg-muted">Loading…</p>}

          {notificationsQuery.isError && (
            <div className="flex items-center gap-2 p-4 text-sm text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Couldn't load notifications.
            </div>
          )}

          {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 && (
            <p className="p-6 text-center text-sm text-fg-muted">You're all caught up.</p>
          )}

          {notifications.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              placementName={
                n.placementId
                  ? (() => {
                      const placement = placementsQuery.data?.find((p) => p.id === n.placementId)
                      return placement ? getPlacementDisplayName(placement, categoriesQuery.data ?? []) : null
                    })()
                  : null
              }
              leaderCompany={
                n.payload.leaderCompanyId
                  ? (companiesQuery.data?.find((c) => c.id === n.payload.leaderCompanyId) ?? null)
                  : null
              }
              onOpen={() => {
                if (!n.readAt) markRead.mutate(n.id)
                setOpen(false)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationRow({
  notification,
  placementName,
  leaderCompany,
  onOpen,
}: {
  notification: Notification
  placementName: string | null
  leaderCompany: Company | null
  onOpen: () => void
}) {
  const isUnread = !notification.readAt

  return (
    <Link
      to="/dashboard"
      onClick={onOpen}
      className={cn(
        'flex flex-col gap-1 border-b border-border px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-surface-raised',
        isUnread && 'bg-brand/5',
      )}
    >
      <span className="flex items-start gap-2">
        {isUnread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
        <span className="font-medium text-fg">
          {notification.type === 'outbid'
            ? `You were outbid${placementName ? ` on ${placementName}` : ''}`
            : 'Your bid was confirmed'}
        </span>
      </span>
      {notification.type === 'outbid' && notification.payload.leaderAmount !== undefined && (
        <span className="flex items-center gap-1.5 pl-3.5 text-xs text-fg-muted">
          {leaderCompany && (
            <CompanyAvatar
              initials={leaderCompany.initials}
              color={leaderCompany.logoColor}
              logoUrl={leaderCompany.logoUrl}
              size="sm"
              className="h-4 w-4 text-[8px]"
            />
          )}
          {leaderCompany?.name ?? 'A competitor'} is now bidding {formatCurrency(notification.payload.leaderAmount)}
        </span>
      )}
      <span className="pl-3.5 text-xs text-fg-subtle">{formatRelativeTime(notification.createdAt)}</span>
    </Link>
  )
}
