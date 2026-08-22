import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setCompanyCategories } from '@/lib/supabase/mutations'

interface SetCategoriesArgs {
  companyId: string
  categoryIds: string[]
}

/** Same cache invalidation set as useUploadCompanyLogo — anything that reads a company's categoryIds needs to refresh. */
export function useSetCompanyCategories() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, categoryIds }: SetCategoriesArgs) => setCompanyCategories(companyId, categoryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCompanies'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company'] })
      queryClient.invalidateQueries({ queryKey: ['companiesByCategory'] })
    },
  })
}
