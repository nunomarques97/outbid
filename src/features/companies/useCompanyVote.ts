import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { getCompanyVoteState } from '@/lib/supabase/queries'
import { toggleCompanyVote } from '@/lib/supabase/mutations'

/**
 * A company's vote state + a toggle action. Persistent customer actions
 * require an authenticated user (Phase 31) — there is no signed-out
 * fallback anymore: `signedIn` tells VoteButton whether to call `toggle()`
 * or open the sign-in dialog instead, and `toggle()` itself is a no-op
 * when signed out as a second, defensive guard against ever reaching
 * Supabase without a real session.
 */
export function useCompanyVote(companySlug: string, baseVotes: number) {
  const { user, isConfigured } = useAuth()
  const queryClient = useQueryClient()

  const signedIn = isConfigured && Boolean(user)
  const queryKey = ['companyVote', companySlug, user?.id] as const

  const { data: live } = useQuery({
    queryKey,
    queryFn: () => getCompanyVoteState(companySlug, user!.id),
    enabled: signedIn,
  })

  const mutation = useMutation({
    mutationFn: () => toggleCompanyVote(live!.companyId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      // organicVotes is also read from these separately-cached queries
      // (the profile page's own "Organic votes" stat, leaderboards, search)
      // — without this, voting updates VoteButton's own count but leaves
      // every other rendering of the same number stale until a refresh.
      queryClient.invalidateQueries({ queryKey: ['company', companySlug] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['companiesByCategory'] })
    },
  })

  return {
    voted: signedIn ? (live?.voted ?? false) : false,
    count: signedIn ? (live?.total ?? baseVotes) : baseVotes,
    toggle: () => {
      if (!signedIn) return
      mutation.mutate()
    },
    signedIn,
  }
}
