import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/useAuth'
import { getMyWatchedDealIds } from '@/lib/supabase/queries'
import { watchDeal, unwatchDeal } from '@/lib/supabase/mutations'

const STALE_TIME = 30_000

function watchedDealIdsKey(userId: string | undefined) {
  return ['watchedDealIds', userId] as const
}

/**
 * Just the watched deal IDs — DealCard combines this with the already-cached
 * useDeals() list. Still reads the deal_claims table underneath (see
 * *_deal_claims.sql / *_deal_management_and_unwatch.sql) — only the
 * customer-facing concept changed from "claim" to "watch," not the database.
 */
export function useMyWatchedDealIds() {
  const { user, isConfigured } = useAuth()
  return useQuery({
    queryKey: watchedDealIdsKey(user?.id),
    queryFn: () => getMyWatchedDealIds(user!.id),
    staleTime: STALE_TIME,
    enabled: isConfigured && Boolean(user),
  })
}

/** Shared by useWatchDeal/useUnwatchDeal: optimistically add/remove a dealId from the cached id list, rolling back on error. */
function optimisticWatchedIdsMutation(
  queryClient: QueryClient,
  userId: string | undefined,
  apply: (ids: string[], dealId: string) => string[],
) {
  const queryKey = watchedDealIdsKey(userId)
  return {
    onMutate: async (dealId: string) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<string[]>(queryKey)
      queryClient.setQueryData<string[]>(queryKey, (ids) => apply(ids ?? [], dealId))
      return { previous }
    },
    onError: (_err: unknown, _dealId: string, context: { previous?: string[] } | undefined) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error('Could not update your watched deals. Please try again.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      // The public watch count (deals.claimCount) changed too.
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  }
}

export function useWatchDeal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dealId: string) => watchDeal(user!.id, dealId),
    ...optimisticWatchedIdsMutation(queryClient, user?.id, (ids, dealId) =>
      ids.includes(dealId) ? ids : [dealId, ...ids],
    ),
  })
}

/** Watching is a toggle, unlike Phase 19's original permanent "claim" — a customer can remove a deal from their watched list at any time. */
export function useUnwatchDeal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dealId: string) => unwatchDeal(user!.id, dealId),
    ...optimisticWatchedIdsMutation(queryClient, user?.id, (ids, dealId) => ids.filter((id) => id !== dealId)),
  })
}
