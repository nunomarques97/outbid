import { describe, it, expect } from 'vitest'
import { validateCategorySelection, MAX_COMPANY_CATEGORIES } from './companyCategories'

describe('validateCategorySelection', () => {
  it('rejects zero categories', () => {
    expect(validateCategorySelection([])).toBe('Choose at least one category.')
  })

  it('accepts one category', () => {
    expect(validateCategorySelection(['cat-1'])).toBeNull()
  })

  it('accepts exactly the maximum number of categories', () => {
    const ids = Array.from({ length: MAX_COMPANY_CATEGORIES }, (_, i) => `cat-${i}`)
    expect(validateCategorySelection(ids)).toBeNull()
  })

  it('rejects one more than the maximum', () => {
    const ids = Array.from({ length: MAX_COMPANY_CATEGORIES + 1 }, (_, i) => `cat-${i}`)
    expect(validateCategorySelection(ids)).toBe(`Choose at most ${MAX_COMPANY_CATEGORIES} categories.`)
  })
})
