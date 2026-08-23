export interface PageResult<T> {
  pageItems: T[]
  totalPages: number
  currentPage: number
  isFirstPage: boolean
  isLastPage: boolean
}

/**
 * Slices `items` into fixed-size pages and reports where `page` (0-indexed,
 * clamped into range) lands. `totalPages`/`isFirstPage`/`isLastPage` are
 * always derived from the FULL `items` array, never from `pageItems` —
 * this is what a "next/previous" control's disabled state must be based
 * on, not how many items happen to be currently rendered (13 items at
 * pageSize 3 must always report 5 total pages, even mid-navigation).
 */
export function paginate<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(Math.max(0, page), totalPages - 1)
  const pageItems = items.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
  return {
    pageItems,
    totalPages,
    currentPage,
    isFirstPage: currentPage === 0,
    isLastPage: currentPage === totalPages - 1,
  }
}
