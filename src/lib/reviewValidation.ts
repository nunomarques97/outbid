export const REVIEW_TITLE_MIN = 3
export const REVIEW_TITLE_MAX = 100
export const REVIEW_BODY_MIN = 10
export const REVIEW_BODY_MAX = 3000

export interface ReviewInput {
  rating: number
  title: string
  body: string
}

/**
 * Pure validation, shared by the review form (fail fast, specific message)
 * and exercised directly in reviewValidation.test.ts. Mirrors the CHECK
 * constraints in supabase/migrations/*_reviews.sql exactly — those remain
 * the real enforcement (a client bypassing this function entirely still
 * can't get an invalid row past the database), this just avoids a round
 * trip for the common case.
 */
export function validateReview({ rating, title, body }: ReviewInput): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return 'Choose a star rating.'

  const trimmedTitle = title.trim()
  if (trimmedTitle.length < REVIEW_TITLE_MIN) return `Title must be at least ${REVIEW_TITLE_MIN} characters.`
  if (trimmedTitle.length > REVIEW_TITLE_MAX) return `Title must be ${REVIEW_TITLE_MAX} characters or fewer.`

  const trimmedBody = body.trim()
  if (trimmedBody.length < REVIEW_BODY_MIN) return `Review must be at least ${REVIEW_BODY_MIN} characters.`
  if (trimmedBody.length > REVIEW_BODY_MAX) return `Review must be ${REVIEW_BODY_MAX} characters or fewer.`

  return null
}
