import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { getMyBattleVote } from '@/lib/supabase/queries'
import { castBattleVote } from '@/lib/supabase/mutations'
import { useSession } from '@/store/useSession'

/**
 * Mirrors useCompanyVote's shape: Supabase-backed when configured and
 * signed in (battle_votes' UNIQUE(battle_id, user_id) constraint is the
 * real enforcement), falling back to the existing Zustand voteBattle()
 * behavior — unchanged — otherwise.
 */
export function useBattleVote(battleId: string) {
  const { user, isConfigured } = useAuth()
  const queryClient = useQueryClient()

  const localVotes = useSession((s) => s.votes)
  const localVoteBattle = useSession((s) => s.voteBattle)
  const localVotedA = localVotes[`battle:${battleId}:a`] === 1
  const localVotedB = localVotes[`battle:${battleId}:b`] === 1

  const liveEnabled = isConfigured && Boolean(user)
  const queryKey = ['myBattleVote', battleId, user?.id] as const

  const { data: liveSide } = useQuery({
    queryKey,
    queryFn: () => getMyBattleVote(battleId, user!.id),
    enabled: liveEnabled,
  })

  const mutation = useMutation({
    mutationFn: (side: 'a' | 'b') => castBattleVote(battleId, user!.id, side),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['battle', battleId] })
      queryClient.invalidateQueries({ queryKey: ['battles'] })
    },
  })

  if (liveEnabled) {
    return {
      votedA: liveSide === 'a',
      votedB: liveSide === 'b',
      vote: (side: 'a' | 'b') => mutation.mutate(side),
    }
  }

  return {
    votedA: localVotedA,
    votedB: localVotedB,
    vote: (side: 'a' | 'b') => localVoteBattle(battleId, side),
  }
}
