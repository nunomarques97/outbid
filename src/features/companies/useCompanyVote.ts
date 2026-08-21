import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { getCompanyVoteState } from '@/lib/supabase/queries'
import { toggleCompanyVote } from '@/lib/supabase/mutations'
import { useSession, getVoteCount } from '@/store/useSession'

/**
 * A company's vote state + a toggle action, sourced from Supabase when the
 * user is signed in against a configured project, and from the existing
 * Zustand session (exactly today's behavior, untouched) otherwise. This is
 * the one place that branches — VoteButton itself doesn't need to know
 * which mode it's in.
 */
export function useCompanyVote(companyId: string, companySlug: string, baseVotes: number) {
  const { user, isConfigured } = useAuth()
  const queryClient = useQueryClient()

  const votes = useSession((s) => s.votes)
  const localVote = useSession((s) => s.vote)
  const localVoted = votes[`company:${companyId}`] === 1
  const localCount = getVoteCount(baseVotes, votes, 'company', companyId)

  const liveEnabled = isConfigured && Boolean(user)
  const queryKey = ['companyVote', companySlug, user?.id] as const

  const { data: live } = useQuery({
    queryKey,
    queryFn: () => getCompanyVoteState(companySlug, user!.id),
    enabled: liveEnabled,
  })

  const mutation = useMutation({
    mutationFn: () => toggleCompanyVote(live!.companyId, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  if (liveEnabled) {
    return {
      voted: live?.voted ?? false,
      count: live?.total ?? baseVotes,
      toggle: () => mutation.mutate(),
      isLive: true as const,
    }
  }

  return {
    voted: localVoted,
    count: localCount,
    toggle: () => localVote('company', companyId, 1),
    isLive: false as const,
  }
}
