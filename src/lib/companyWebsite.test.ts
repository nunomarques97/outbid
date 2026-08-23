import { describe, it, expect } from 'vitest'
import { isValidCompanyWebsite } from './companyWebsite'

describe('isValidCompanyWebsite', () => {
  it('accepts a normal bare domain', () => {
    expect(isValidCompanyWebsite('apple.com')).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidCompanyWebsite(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isValidCompanyWebsite(undefined)).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidCompanyWebsite('')).toBe(false)
  })

  it('rejects a whitespace-only string', () => {
    expect(isValidCompanyWebsite('   ')).toBe(false)
  })
})
