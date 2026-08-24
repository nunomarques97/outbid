import { useEffect, useState } from 'react'
import { VISUAL_STYLE_STORAGE_KEY, parseVisualStyle, toggleVisualStyle, type VisualStyle } from '@/lib/visualStyle'

function readStoredStyle(): VisualStyle {
  if (typeof window === 'undefined') return parseVisualStyle(null)
  return parseVisualStyle(window.localStorage.getItem(VISUAL_STYLE_STORAGE_KEY))
}

/** Dev/design-review presentation toggle — swaps the `data-style` attribute the CSS in index.css keys off of. No app data, routing, or behavior depends on this. */
export function useVisualStyle() {
  const [style, setStyle] = useState<VisualStyle>(readStoredStyle)

  useEffect(() => {
    document.documentElement.setAttribute('data-style', style)
    window.localStorage.setItem(VISUAL_STYLE_STORAGE_KEY, style)
  }, [style])

  function toggle() {
    setStyle(toggleVisualStyle)
  }

  return { style, toggle }
}
