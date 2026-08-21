import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCompany } from '@/lib/supabase/mutations'

/**
 * Thin wrapper around the existing createCompany() mutation — no ownership
 * logic here. The signed-in caller becomes the company's owner entirely
 * through the database's own handle_new_company trigger (see
 * supabase/migrations/*_rpc_functions.sql); this hook only calls the
 * insert and refreshes the caches that need to know about the new company.
 */
export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCompanies'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
    },
  })
}

/** True if the error is a Postgres unique-violation (23505) — e.g. a slug collision on companies.slug. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === '23505'
}
