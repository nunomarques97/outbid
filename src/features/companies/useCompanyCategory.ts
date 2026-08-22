import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setCompanyCategory } from '@/lib/supabase/mutations'

interface SetCategoryArgs {
  companyId: string
  categoryId: string
}

/** Same cache invalidation set as useUploadCompanyLogo — anything that reads a company's categoryIds needs to refresh. */
export function useSetCompanyCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, categoryId }: SetCategoryArgs) => setCompanyCategory(companyId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCompanies'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company'] })
      queryClient.invalidateQueries({ queryKey: ['companiesByCategory'] })
    },
  })
}
