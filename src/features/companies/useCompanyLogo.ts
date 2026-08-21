import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadCompanyLogo } from '@/lib/supabase/mutations'

interface UploadArgs {
  companyId: string
  file: File
  previousPath?: string | null
}

/**
 * No upload/authorization logic here — uploadCompanyLogo() already does the
 * upload, the companies.logo_path update, and best-effort cleanup of the
 * old file. This just wires it into React Query so callers get
 * loading/error state and the right caches refresh afterward.
 */
export function useUploadCompanyLogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ companyId, file, previousPath }: UploadArgs) => uploadCompanyLogo(companyId, file, previousPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCompanies'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company'] })
      queryClient.invalidateQueries({ queryKey: ['companiesByCategory'] })
    },
  })
}
