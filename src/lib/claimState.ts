export type ClaimCtaState = 'hidden' | 'pending' | 'signedOut' | 'claimable'

export interface ClaimStateInput {
  signedIn: boolean
  /** Whether the current user already manages any company (their own included) — server-enforced one-company-per-user, mirrored here for the CTA. */
  managesAnyCompany: boolean
  /** Whether the current user's own most recent claim on this company is still pending review. */
  hasPendingClaim: boolean
}

/**
 * The single priority ladder for the "Claim this profile" CTA, extracted
 * out of ClaimCompanyButton so it's unit-testable independent of rendering.
 * Order matters: a user who already manages a company is blocked before a
 * pending claim is even considered — create_company_claim would reject
 * either way, but "hidden" is checked first here because it's a matter of
 * who is eligible to claim at all, not this company's own claim history.
 */
export function getClaimCtaState({ signedIn, managesAnyCompany, hasPendingClaim }: ClaimStateInput): ClaimCtaState {
  if (managesAnyCompany) return 'hidden'
  if (!signedIn) return 'signedOut'
  if (hasPendingClaim) return 'pending'
  return 'claimable'
}
