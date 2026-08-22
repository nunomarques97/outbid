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

/**
 * True if the error is an RLS policy violation (42501) — for company
 * creation specifically, this means "you already manage a company"
 * (see companies' insert policy in 20260822080000_one_company_per_user.sql).
 * CreateCompanyPage already hides the form entirely for a user who has a
 * company, so this only matters for the race/direct-API-call case; it
 * still deserves a clear, non-technical message rather than the raw
 * Postgres error text.
 */
export function isRlsViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === '42501'
}

/**
 * True if the error is a Postgres check-violation (23514) — for
 * company_categories specifically, this means the max-5-categories trigger
 * (company_categories_enforce_limit) rejected the write. The frontend
 * already blocks selecting a 6th category, so this only matters for a
 * direct-API-call bypass, same reasoning as isRlsViolation above.
 */
export function isCategoryLimitViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: unknown }).code === '23514'
}
