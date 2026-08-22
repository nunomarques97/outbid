import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/useAuth'
import { getSavedCompanyIds } from '@/lib/supabase/queries'
import { saveCompany, unsaveCompany } from '@/lib/supabase/mutations'
import { useSession } from '@/store/useSession'

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
 * SaveButton's one dependency — mirrors useCompanyVote's shape exactly
 * (live via Supabase when signed in against a configured project, the
 * existing Zustand session otherwise) so SaveButton itself barely changes.
 * Unlike votes, there is no public fallback *read* for saves (they're
 * private), so the signed-out path is purely local, same as it is today.
 */
export function useSaveState(companyId: string) {
  const { user, isConfigured } = useAuth()
  const savedIdsQuery = useSavedCompanyIds()
  const saveMutation = useSaveCompanyMutation()
  const unsaveMutation = useUnsaveCompanyMutation()

  const localSaved = useSession((s) => s.savedCompanyIds.includes(companyId))
  const localToggle = useSession((s) => s.toggleSave)

  const liveEnabled = isConfigured && Boolean(user)

  if (liveEnabled) {
    const saved = savedIdsQuery.data?.includes(companyId) ?? false
    return {
      saved,
      toggle: () => (saved ? unsaveMutation.mutate(companyId) : saveMutation.mutate(companyId)),
      pending: saveMutation.isPending || unsaveMutation.isPending,
      isLive: true as const,
    }
  }

  return {
    saved: localSaved,
    toggle: () => localToggle(companyId),
    pending: false,
    isLive: false as const,
  }
}
