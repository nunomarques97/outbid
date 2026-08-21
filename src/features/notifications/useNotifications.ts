import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { useMyCompanies } from '@/lib/supabase/hooks'
import { getNotificationsForCompanies, markNotificationRead, markAllNotificationsRead } from '@/lib/supabase/queries'

/**
 * Notifications across every company the signed-in user belongs to — a
 * user with multiple companies must see outbid events for all of them in
 * one bell, not just whichever company useMyCompanies() happens to return
 * first. Reuses useMyCompanies() rather than re-deriving "which companies
 * am I" a second way — same cache, no extra request beyond what the
 * dashboard already warms.
 */
export function useNotifications() {
  const { user, isConfigured } = useAuth()
  const myCompaniesQuery = useMyCompanies()
  const companyIds = myCompaniesQuery.data?.map((c) => c.id) ?? []
  const companyIdsKey = companyIds.slice().sort().join(',')

  const query = useQuery({
    queryKey: ['notifications', companyIdsKey],
    queryFn: () => getNotificationsForCompanies(companyIds),
    enabled: isConfigured && Boolean(user) && companyIds.length > 0,
  })

  return { ...query, companyIds }
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    // Prefix match: invalidates every ['notifications', ...] entry regardless
    // of the specific id or company set, no need to know it here.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (companyIds: string[]) => markAllNotificationsRead(companyIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
