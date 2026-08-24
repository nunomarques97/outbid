import { describe, it, expect } from 'vitest'
import { parseVisualStyle, toggleVisualStyle, DEFAULT_VISUAL_STYLE } from './visualStyle'

describe('parseVisualStyle', () => {
  it('defaults to "new" when nothing is stored', () => {
    expect(parseVisualStyle(null)).toBe('new')
  })

  it('defaults to "new"', () => {
    expect(DEFAULT_VISUAL_STYLE).toBe('new')
  })

  it('"new" in storage resolves to the new style', () => {
    expect(parseVisualStyle('new')).toBe('new')
  })

  it('"legacy" in storage resolves to the legacy style', () => {
    expect(parseVisualStyle('legacy')).toBe('legacy')
  })

  it('falls back to "new" for an unrecognized stored value', () => {
    expect(parseVisualStyle('garbage')).toBe('new')
  })
})

describe('toggleVisualStyle', () => {
  it('switches new -> legacy', () => {
    expect(toggleVisualStyle('new')).toBe('legacy')
  })

  it('switches legacy -> new', () => {
    expect(toggleVisualStyle('legacy')).toBe('new')
  })

  it('a refresh after toggling preserves the toggled style (round-trip through storage)', () => {
    const toggled = toggleVisualStyle('new')
    expect(parseVisualStyle(toggled)).toBe(toggled)
  })
})
