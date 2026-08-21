import { describe, it, expect, beforeEach } from 'vitest'
import { useSession } from './useSession'

const BATTLE_ID = 'battle-test'

function reset() {
  useSession.setState({ votes: {}, savedCompanyIds: [] })
}

describe('voteBattle', () => {
  beforeEach(reset)

  it('casts a vote for a side', () => {
    useSession.getState().voteBattle(BATTLE_ID, 'a')
    const { votes } = useSession.getState()
    expect(votes[`battle:${BATTLE_ID}:a`]).toBe(1)
    expect(votes[`battle:${BATTLE_ID}:b`]).toBeUndefined()
  })

  it('is mutually exclusive: voting for the other side clears the first vote', () => {
    useSession.getState().voteBattle(BATTLE_ID, 'a')
    useSession.getState().voteBattle(BATTLE_ID, 'b')
    const { votes } = useSession.getState()
    expect(votes[`battle:${BATTLE_ID}:a`]).toBeUndefined()
    expect(votes[`battle:${BATTLE_ID}:b`]).toBe(1)
  })

  it('never allows both sides to be recorded as voted at once, across repeated toggles', () => {
    const sides: Array<'a' | 'b'> = ['a', 'b', 'a', 'a', 'b', 'b', 'a']
    for (const side of sides) {
      useSession.getState().voteBattle(BATTLE_ID, side)
      const { votes } = useSession.getState()
      const votedA = votes[`battle:${BATTLE_ID}:a`] === 1
      const votedB = votes[`battle:${BATTLE_ID}:b`] === 1
      expect(votedA && votedB).toBe(false)
    }
  })

  it('voting the same side again removes the vote entirely (toggle off)', () => {
    useSession.getState().voteBattle(BATTLE_ID, 'a')
    useSession.getState().voteBattle(BATTLE_ID, 'a')
    const { votes } = useSession.getState()
    expect(votes[`battle:${BATTLE_ID}:a`]).toBeUndefined()
    expect(votes[`battle:${BATTLE_ID}:b`]).toBeUndefined()
  })
})
