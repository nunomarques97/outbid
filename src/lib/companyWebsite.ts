/** Bare, non-empty domain — the same "no protocol" convention as company.website everywhere else in this app. */
export function isValidCompanyWebsite(website: string | null | undefined): website is string {
  return typeof website === 'string' && website.trim().length > 0
}
