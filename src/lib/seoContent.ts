const MAX_DESCRIPTION_LENGTH = 160

/** Cuts at the last whole word within `max` chars, so a truncated description never ends mid-word. */
export function truncateDescription(text: string, max: number = MAX_DESCRIPTION_LENGTH): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= max) return trimmed
  const cut = trimmed.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export function buildCompanyDescription(company: { name: string; tagline?: string | null; description?: string | null }): string {
  const tagline = company.tagline?.trim()
  const description = company.description?.trim()
  const body = [tagline, description].filter(Boolean).join(' — ')
  const full = body
    ? `${company.name}: ${body}. See its Repcastr ranking, reviews, and sponsored status.`
    : `${company.name} on Repcastr — real community votes, reviews, and transparent sponsored placement.`
  return truncateDescription(full)
}

export function buildCategoryDescription(category: { name: string; description?: string | null }): string {
  const description = category.description?.trim()
  const full = description
    ? `${category.name} on Repcastr: ${description} Ranked by real community votes, with sponsored placement always labeled.`
    : `Discover and compare ${category.name} companies on Repcastr, ranked by real community votes with transparent sponsored placement.`
  return truncateDescription(full)
}

export function buildSearchDescription(query: string | null | undefined): string {
  const trimmed = query?.trim()
  const full = trimmed
    ? `Search results for "${trimmed}" on Repcastr — companies, categories, reviews, and deals.`
    : 'Search Repcastr for companies, categories, reviews, and deals — all ranked by real community votes.'
  return truncateDescription(full)
}
