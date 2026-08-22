/**
 * A company must belong to at least one category and no more than
 * MAX_COMPANY_CATEGORIES — enforced here so CreateCompanyForm and
 * EditCompanyDialog validate identically, and mirrored by a database
 * trigger (see supabase/migrations/20260822090000_category_architecture_v1.sql)
 * for the max, so the rule holds even if the frontend is bypassed.
 */
export const MAX_COMPANY_CATEGORIES = 5

export function validateCategorySelection(categoryIds: string[]): string | null {
  if (categoryIds.length === 0) return 'Choose at least one category.'
  if (categoryIds.length > MAX_COMPANY_CATEGORIES) return `Choose at most ${MAX_COMPANY_CATEGORIES} categories.`
  return null
}
