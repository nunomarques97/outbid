import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDeal, updateDeal, deleteDeal } from '@/lib/supabase/mutations'

interface DealFormInput {
  title: string
  discountLabel: string
  description: string
  expiresAt: string
  destinationUrl?: string | null
}

function useInvalidateDeals() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['deals'] })
}

export function useCreateDeal() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: ({ companyId, ...input }: DealFormInput & { companyId: string }) => createDeal(companyId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateDeal() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: ({ dealId, ...input }: DealFormInput & { dealId: string }) => updateDeal(dealId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteDeal() {
  const invalidate = useInvalidateDeals()
  return useMutation({
    mutationFn: (dealId: string) => deleteDeal(dealId),
    onSuccess: invalidate,
  })
}
