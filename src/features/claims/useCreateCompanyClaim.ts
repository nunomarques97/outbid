import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCompanyClaim } from '@/lib/supabase/mutations'

interface CreateCompanyClaimArgs {
  companyId: string
  reason: string
  contactEmail: string | null
  evidence: string | null
}

/** Invalidates this company's claim status so the CTA immediately reflects "pending" without a manual refetch. */
export function useCreateCompanyClaim() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: CreateCompanyClaimArgs) => createCompanyClaim(args),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myClaim', variables.companyId] })
    },
  })
}
