import { describe, it, expect } from 'vitest'
import { deriveAvatarColor } from './avatarColor'

describe('deriveAvatarColor', () => {
  it('is deterministic — the same seed always returns the same color', () => {
    const seed = 'user-123-abc'
    const first = deriveAvatarColor(seed)
    for (let i = 0; i < 5; i++) {
      expect(deriveAvatarColor(seed)).toBe(first)
    }
  })

  it('returns a valid hex color', () => {
    expect(deriveAvatarColor('some-uuid')).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('tends to differ for different seeds', () => {
    const colors = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(deriveAvatarColor))
    expect(colors.size).toBeGreaterThan(1)
  })

  it('is stable for an empty string (no crash on edge input)', () => {
    expect(() => deriveAvatarColor('')).not.toThrow()
    expect(deriveAvatarColor('')).toBe(deriveAvatarColor(''))
  })
})
