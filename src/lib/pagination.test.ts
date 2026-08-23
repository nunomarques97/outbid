import { describe, it, expect } from 'vitest'
import { paginate } from './pagination'

// 13 items at page size 3 is the exact production scenario (13 active
// categories) — page 1-4 hold 3 items each, page 5 holds the remaining 1.
const THIRTEEN_ITEMS = Array.from({ length: 13 }, (_, i) => `item-${i + 1}`)

describe('paginate', () => {
  it('13 items at page size 3 produces exactly 5 total pages', () => {
    expect(paginate(THIRTEEN_ITEMS, 0, 3).totalPages).toBe(5)
  })

  it('page 1 (index 0) shows the first 3 items', () => {
    const result = paginate(THIRTEEN_ITEMS, 0, 3)
    expect(result.pageItems).toEqual(['item-1', 'item-2', 'item-3'])
  })

  it('page 1 has left disabled, right enabled', () => {
    const result = paginate(THIRTEEN_ITEMS, 0, 3)
    expect(result.isFirstPage).toBe(true)
    expect(result.isLastPage).toBe(false)
  })

  it('the final (5th) page holds only the 1 remaining item', () => {
    const result = paginate(THIRTEEN_ITEMS, 4, 3)
    expect(result.pageItems).toEqual(['item-13'])
    expect(result.isFirstPage).toBe(false)
    expect(result.isLastPage).toBe(true)
  })

  it('every item across all 5 pages reconstructs the full original list', () => {
    const allSeen: string[] = []
    for (let page = 0; page < 5; page++) {
      allSeen.push(...paginate(THIRTEEN_ITEMS, page, 3).pageItems)
    }
    expect(allSeen).toEqual(THIRTEEN_ITEMS)
  })

  it('totalPages/isLastPage are derived from the full list, not from pageItems.length', () => {
    // A page with fewer than pageSize items (the last, partial page) must
    // still report the correct total — never "show arrows only when
    // pageItems.length > pageSize".
    const result = paginate(THIRTEEN_ITEMS, 4, 3)
    expect(result.pageItems.length).toBe(1)
    expect(result.totalPages).toBe(5)
  })

  it('clamps an out-of-range page index into range', () => {
    expect(paginate(THIRTEEN_ITEMS, 99, 3).currentPage).toBe(4)
    expect(paginate(THIRTEEN_ITEMS, -5, 3).currentPage).toBe(0)
  })

  it('a list shorter than one page is a single page with both arrows disabled', () => {
    const result = paginate(['a', 'b'], 0, 3)
    expect(result.totalPages).toBe(1)
    expect(result.isFirstPage).toBe(true)
    expect(result.isLastPage).toBe(true)
  })

  it('an empty list is still a single (empty) page, never zero pages', () => {
    const result = paginate([], 0, 3)
    expect(result.totalPages).toBe(1)
    expect(result.pageItems).toEqual([])
  })
})
