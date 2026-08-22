import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { getMyBattleVote } from '@/lib/supabase/queries'
import { castBattleVote } from '@/lib/supabase/mutations'

/**
 * Mirrors useCompanyVote's shape: battle_votes' UNIQUE(battle_id, user_id)
 * constraint is the real enforcement. Persistent customer actions require
 * an authenticated user (Phase 31) — there is no signed-out fallback
 * anymore: `signedIn` tells VoteSplitBar whether to call `vote()` or open
 * the sign-in dialog instead, and `vote()` itself is a no-op when signed
 * out as a second, defensive guard.
 */
export function useBattleVote(battleId: string) {
  const { user, isConfigured } = useAuth()
  const queryClient = useQueryClient()

  const signedIn = isConfigured && Boolean(user)
  const queryKey = ['myBattleVote', battleId, user?.id] as const

  const { data: liveSide } = useQuery({
    queryKey,
    queryFn: () => getMyBattleVote(battleId, user!.id),
    enabled: signedIn,
  })

  const mutation = useMutation({
    mutationFn: (side: 'a' | 'b') => castBattleVote(battleId, user!.id, side),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['battle', battleId] })
      queryClient.invalidateQueries({ queryKey: ['battles'] })
    },
  })

  return {
    votedA: signedIn && liveSide === 'a',
    votedB: signedIn && liveSide === 'b',
    vote: (side: 'a' | 'b') => {
      if (!signedIn) return
      mutation.mutate(side)
    },
    signedIn,
  }
}
