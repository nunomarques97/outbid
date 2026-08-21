import { describe, it, expect } from 'vitest'
import { validateReview, REVIEW_TITLE_MIN, REVIEW_TITLE_MAX, REVIEW_BODY_MIN, REVIEW_BODY_MAX } from './reviewValidation'

function validInput(overrides: Partial<Parameters<typeof validateReview>[0]> = {}) {
  return { rating: 5, title: 'Great service', body: 'They were fast, friendly, and delivered exactly what I needed.', ...overrides }
}

describe('validateReview', () => {
  it('accepts a well-formed review', () => {
    expect(validateReview(validInput())).toBeNull()
  })

  it('rejects a rating outside 1-5', () => {
    expect(validateReview(validInput({ rating: 0 }))).not.toBeNull()
    expect(validateReview(validInput({ rating: 6 }))).not.toBeNull()
  })

  it('rejects a non-integer rating', () => {
    expect(validateReview(validInput({ rating: 3.5 }))).not.toBeNull()
  })

  it('accepts boundary ratings 1 and 5', () => {
    expect(validateReview(validInput({ rating: 1 }))).toBeNull()
    expect(validateReview(validInput({ rating: 5 }))).toBeNull()
  })

  it('rejects a title shorter than the minimum', () => {
    expect(validateReview(validInput({ title: 'ab' }))).not.toBeNull()
  })

  it('rejects a whitespace-only title as effectively empty', () => {
    expect(validateReview(validInput({ title: '     ' }))).not.toBeNull()
  })

  it('accepts a title exactly at the minimum length', () => {
    expect(validateReview(validInput({ title: 'a'.repeat(REVIEW_TITLE_MIN) }))).toBeNull()
  })

  it('rejects a title longer than the maximum', () => {
    expect(validateReview(validInput({ title: 'a'.repeat(REVIEW_TITLE_MAX + 1) }))).not.toBeNull()
  })

  it('accepts a title exactly at the maximum length', () => {
    expect(validateReview(validInput({ title: 'a'.repeat(REVIEW_TITLE_MAX) }))).toBeNull()
  })

  it('rejects a body shorter than the minimum', () => {
    expect(validateReview(validInput({ body: 'too short' }))).not.toBeNull()
    expect('too short'.length).toBeLessThan(REVIEW_BODY_MIN)
  })

  it('rejects a whitespace-only body as effectively empty', () => {
    expect(validateReview(validInput({ body: '   \n\t  ' }))).not.toBeNull()
  })

  it('rejects a body longer than the maximum', () => {
    expect(validateReview(validInput({ body: 'a'.repeat(REVIEW_BODY_MAX + 1) }))).not.toBeNull()
  })

  it('accepts a body exactly at the maximum length', () => {
    expect(validateReview(validInput({ body: 'a'.repeat(REVIEW_BODY_MAX) }))).toBeNull()
  })
})
