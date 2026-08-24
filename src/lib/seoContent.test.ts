import { describe, it, expect } from 'vitest'
import { truncateDescription, buildCompanyDescription, buildCategoryDescription, buildSearchDescription } from './seoContent'

describe('truncateDescription', () => {
  it('leaves a short string untouched', () => {
    expect(truncateDescription('short and sweet')).toBe('short and sweet')
  })

  it('truncates a long string at a whole word, appending an ellipsis', () => {
    const long = 'word '.repeat(60).trim()
    const result = truncateDescription(long, 40)
    expect(result.length).toBeLessThanOrEqual(40)
    expect(result.endsWith('…')).toBe(true)
    expect(result.endsWith(' …')).toBe(false)
  })

  it('collapses internal whitespace before measuring length', () => {
    expect(truncateDescription('a   b   c')).toBe('a b c')
  })
})

describe('buildCompanyDescription', () => {
  it('combines tagline and description with the company name', () => {
    const result = buildCompanyDescription({
      name: 'Acme',
      tagline: 'Widgets done right',
      description: 'Makers of fine widgets since 1990.',
    })
    expect(result).toContain('Acme')
    expect(result).toContain('Widgets done right')
  })

  it('falls back to a generic description when tagline/description are both missing', () => {
    const result = buildCompanyDescription({ name: 'Acme', tagline: null, description: null })
    expect(result).toContain('Acme')
    expect(result).toContain('Repcastr')
  })

  it('never exceeds the meta description length budget', () => {
    const result = buildCompanyDescription({
      name: 'A Very Long Company Name That Goes On',
      tagline: 'x'.repeat(100),
      description: 'y'.repeat(200),
    })
    expect(result.length).toBeLessThanOrEqual(161) // 160 + possible ellipsis char
  })
})

describe('buildCategoryDescription', () => {
  it('uses the real category description when present', () => {
    const result = buildCategoryDescription({ name: 'Automotive', description: 'Cars, car care, and mobility.' })
    expect(result).toContain('Automotive')
    expect(result).toContain('Cars, car care, and mobility.')
  })

  it('falls back to a generic sentence when description is empty', () => {
    const result = buildCategoryDescription({ name: 'Automotive', description: '' })
    expect(result).toContain('Automotive')
    expect(result).toContain('Repcastr')
  })
})

describe('buildSearchDescription', () => {
  it('reflects the active query', () => {
    expect(buildSearchDescription('acme')).toContain('"acme"')
  })

  it('falls back to a generic description when there is no query', () => {
    const result = buildSearchDescription(null)
    expect(result).not.toContain('"')
    expect(result).toContain('Repcastr')
  })

  it('treats a whitespace-only query as no query', () => {
    const result = buildSearchDescription('   ')
    expect(result).not.toContain('"')
  })
})
