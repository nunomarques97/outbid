import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/useAuth'
import { getSavedCompanyIds } from '@/lib/supabase/queries'
import { saveCompany, unsaveCompany } from '@/lib/supabase/mutations'

const STALE_TIME = 30_000

function savedCompanyIdsKey(userId: string | undefined) {
  return ['savedCompanyIds', userId] as const
}

/**
 * Just the saved company IDs — every surface that needs to render actual
 * company data (profile, search, leaderboards, /saved) combines this with
 * the already-cached useAllCompanies() list rather than fetching full
 * company rows here, so saving/loading never adds a second bulk fetch.
 */
export function useSavedCompanyIds() {
  const { user, isConfigured } = useAuth()
  return useQuery({
    queryKey: savedCompanyIdsKey(user?.id),
    queryFn: () => getSavedCompanyIds(user!.id),
    staleTime: STALE_TIME,
    enabled: isConfigured && Boolean(user),
  })
}

/** Shared by useSaveCompany/useUnsaveCompany: optimistically add/remove a companyId from the cached id list, rolling back on error. */
function optimisticSavedIdsMutation(
  queryClient: QueryClient,
  userId: string | undefined,
  apply: (ids: string[], companyId: string) => string[],
) {
  const queryKey = savedCompanyIdsKey(userId)
  return {
    onMutate: async (companyId: string) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<string[]>(queryKey)
      queryClient.setQueryData<string[]>(queryKey, (ids) => apply(ids ?? [], companyId))
      return { previous }
    },
    onError: (_err: unknown, _companyId: string, context: { previous?: string[] } | undefined) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error('Could not update your saved companies. Please try again.')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  }
}

function useSaveCompanyMutation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (companyId: string) => saveCompany(user!.id, companyId),
    ...optimisticSavedIdsMutation(queryClient, user?.id, (ids, companyId) =>
      ids.includes(companyId) ? ids : [companyId, ...ids],
    ),
  })
}

function useUnsaveCompanyMutation() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (companyId: string) => unsaveCompany(user!.id, companyId),
    ...optimisticSavedIdsMutation(queryClient, user?.id, (ids, companyId) => ids.filter((id) => id !== companyId)),
  })
}

/**
 * SaveButton's one dependency. Persistent customer actions require an
 * authenticated user (Phase 31) — there is no signed-out fallback anymore:
 * `signedIn` tells SaveButton whether to call `toggle()` or open the
 * sign-in dialog instead, and `toggle()` itself is a no-op when signed out
 * as a second, defensive guard against ever reaching Supabase without a
 * real session.
 */
export function useSaveState(companyId: string) {
  const { user, isConfigured } = useAuth()
  const savedIdsQuery = useSavedCompanyIds()
  const saveMutation = useSaveCompanyMutation()
  const unsaveMutation = useUnsaveCompanyMutation()

  const signedIn = isConfigured && Boolean(user)
  const saved = signedIn ? (savedIdsQuery.data?.includes(companyId) ?? false) : false

  return {
    saved,
    toggle: () => {
      if (!signedIn) return
      if (saved) unsaveMutation.mutate(companyId)
      else saveMutation.mutate(companyId)
    },
    pending: saveMutation.isPending || unsaveMutation.isPending,
    signedIn,
  }
}
