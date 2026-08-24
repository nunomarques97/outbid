export type VisualStyle = 'new' | 'legacy'

export const VISUAL_STYLE_STORAGE_KEY = 'repcastr_visual_style'
export const DEFAULT_VISUAL_STYLE: VisualStyle = 'new'

/** Any stored value other than exactly "legacy" falls back to the default — covers null (nothing stored yet), "new", and anything unrecognized. */
export function parseVisualStyle(stored: string | null): VisualStyle {
  return stored === 'legacy' ? 'legacy' : DEFAULT_VISUAL_STYLE
}

export function toggleVisualStyle(current: VisualStyle): VisualStyle {
  return current === 'new' ? 'legacy' : 'new'
}
