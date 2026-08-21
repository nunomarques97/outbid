import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type VoteTarget = 'company' | 'battle'
export type VoteKey = `${VoteTarget}:${string}`

interface SessionState {
  votes: Record<VoteKey, 1 | -1>
  savedCompanyIds: string[]
  vote: (targetType: VoteTarget, targetId: string, value: 1 | -1) => void
  voteBattle: (battleId: string, side: 'a' | 'b') => void
  toggleSave: (companyId: string) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      votes: {},
      savedCompanyIds: [],

      vote: (targetType, targetId, value) =>
        set((state) => {
          const key: VoteKey = `${targetType}:${targetId}`
          const current = state.votes[key]
          const votes = { ...state.votes }
          if (current === value) {
            delete votes[key]
          } else {
            votes[key] = value
          }
          return { votes }
        }),

      // Battle votes are mutually exclusive (vote for A or B, never both), unlike the
      // simple upvote toggle used for companies — kept as its own action so that
      // exclusivity logic lives in one place instead of being reimplemented per component.
      voteBattle: (battleId, side) =>
        set((state) => {
          const votes = { ...state.votes }
          const chosenKey: VoteKey = `battle:${battleId}:${side}`
          const otherKey: VoteKey = `battle:${battleId}:${side === 'a' ? 'b' : 'a'}`
          const alreadyChosen = votes[chosenKey] === 1

          delete votes[otherKey]
          if (alreadyChosen) {
            delete votes[chosenKey]
          } else {
            votes[chosenKey] = 1
          }
          return { votes }
        }),

      toggleSave: (companyId) =>
        set((state) => ({
          savedCompanyIds: state.savedCompanyIds.includes(companyId)
            ? state.savedCompanyIds.filter((id) => id !== companyId)
            : [...state.savedCompanyIds, companyId],
        })),
    }),
    { name: 'outbid-session' },
  ),
)

export function getVoteCount(baseVotes: number, votes: Record<VoteKey, 1 | -1>, targetType: VoteTarget, targetId: string) {
  const key: VoteKey = `${targetType}:${targetId}`
  return baseVotes + (votes[key] ?? 0)
}
