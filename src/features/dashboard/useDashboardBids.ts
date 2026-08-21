import { useMutation, useQueryClient } from '@tanstack/react-query'
import { placeBid, withdrawBid } from '@/lib/supabase/mutations'

/**
 * No bidding logic here — both mutations just call the existing place_bid /
 * withdraw_bid RPCs (src/lib/supabase/mutations.ts), which are what
 * actually validate membership and enforce the business rules server-side.
 * This only wires them into React Query so DashboardPage can show
 * loading/success/error state and the ranking data refreshes afterward.
 */

interface PlaceBidArgs {
  companyId: string
  placementId: string
  amount: number
}

export function usePlaceBid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, placementId, amount }: PlaceBidArgs) => placeBid(companyId, placementId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeBids'] })
    },
  })
}

interface WithdrawBidArgs {
  companyId: string
  placementId: string
}

export function useWithdrawBid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, placementId }: WithdrawBidArgs) => withdrawBid(companyId, placementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeBids'] })
    },
  })
}
