import { useLayoutEffect, useRef, useState } from 'react'

interface HorizontalOverflowState {
  /** True once this row's content is wider than its visible box — the only signal that decides whether nav arrows may render at all. */
  hasOverflow: boolean
  canScrollPrev: boolean
  canScrollNext: boolean
}

/**
 * Measures a scrollable row's actual content against its visible width so a
 * "carousel" only ever shows navigation when there is real content to
 * navigate to — never a hardcoded item-count threshold, which breaks the
 * moment the underlying data grows or shrinks (see Top Bidders: awkward
 * with exactly 5 companies today, silently wrong again at 6 or 50 otherwise).
 * Re-measures on resize and whenever the caller's `deps` change (item count,
 * filters, etc.) — a ResizeObserver on the row alone only catches viewport
 * resizes, not content-length changes at a fixed viewport width.
 */
export function useHorizontalOverflow<T extends HTMLElement>(deps: readonly unknown[] = []) {
  const ref = useRef<T>(null)
  const [state, setState] = useState<HorizontalOverflowState>({
    hasOverflow: false,
    canScrollPrev: false,
    canScrollNext: false,
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    function measure() {
      if (!el) return
      const { scrollLeft, scrollWidth, clientWidth } = el
      setState({
        hasOverflow: scrollWidth > clientWidth + 1,
        canScrollPrev: scrollLeft > 4,
        canScrollNext: scrollLeft < scrollWidth - clientWidth - 4,
      })
    }

    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(el)
    el.addEventListener('scroll', measure, { passive: true })
    return () => {
      resizeObserver.disconnect()
      el.removeEventListener('scroll', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  function scrollByPage(direction: 'prev' | 'next') {
    const el = ref.current
    if (!el) return
    const amount = el.clientWidth * 0.9
    el.scrollBy({ left: direction === 'next' ? amount : -amount, behavior: 'smooth' })
  }

  return { ref, ...state, scrollByPage }
}
