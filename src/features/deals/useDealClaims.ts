import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/useAuth'
import { getMyClaimedDealIds } from '@/lib/supabase/queries'
import { claimDeal } from '@/lib/supabase/mutations'

const STALE_TIME = 30_000

function claimedDealIdsKey(userId: string | undefined) {
  return ['claimedDealIds', userId] as const
}

/** Just the claimed deal IDs — DealCard combines this with the already-cached useDeals() list. */
export function useMyClaimedDealIds() {
  const { user, isConfigured } = useAuth()
  return useQuery({
    queryKey: claimedDealIdsKey(user?.id),
    queryFn: () => getMyClaimedDealIds(user!.id),
    staleTime: STALE_TIME,
    enabled: isConfigured && Boolean(user),
  })
}

/**
 * Optimistically adds the claimed id to the cached list, rolling back +
 * toasting on error. Also invalidates ['deals'] on settle, since a
 * successful claim changes the deal's public claimCount (baseline + real
 * claims) that every DealCard shows — not optimistic, since recomputing
 * that number client-side would duplicate the baseline+count logic that
 * already lives once in toDeal().
 */
export function useClaimDeal() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = claimedDealIdsKey(user?.id)

  return useMutation({
    mutationFn: (dealId: string) => claimDeal(user!.id, dealId),
    onMutate: async (dealId: string) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<string[]>(queryKey)
      queryClient.setQueryData<string[]>(queryKey, (ids) => (ids?.includes(dealId) ? ids : [dealId, ...(ids ?? [])]))
      return { previous }
    },
    onError: (_err, _dealId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error('Could not claim this deal. Please try again.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}
