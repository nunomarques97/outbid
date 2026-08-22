import { useMutation, useQueryClient } from '@tanstack/react-query'
import { placeBid, createBidPayment } from '@/lib/supabase/mutations'

/**
 * No bidding logic here — placeBid just calls the existing place_bid RPC
 * (src/lib/supabase/mutations.ts), which is what actually validates
 * membership and enforces the business rules server-side. This only wires
 * it into React Query so DashboardPage can show loading/success/error
 * state and the ranking data refreshes afterward.
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

interface CreateBidPaymentArgs {
  companyId: string
  placementId: string
  targetAmount: number
}

/**
 * Starts a paid bid (new or raised amount). No cache invalidation here —
 * unlike usePlaceBid, this never changes `bids` itself; it only returns a
 * Checkout URL for the caller to redirect to. The bid becomes real once
 * Stripe confirms payment and the webhook activates it, which this
 * browser session finds out about by refetching after the redirect back
 * (see the `bidPayment` query param handling in DashboardPage), not from
 * this mutation resolving. `targetAmount` is what the bid should become,
 * not what gets charged — the server computes the actual charge itself.
 */
export function useCreateBidPayment() {
  return useMutation({
    mutationFn: ({ companyId, placementId, targetAmount }: CreateBidPaymentArgs) =>
      createBidPayment(companyId, placementId, targetAmount),
  })
}
