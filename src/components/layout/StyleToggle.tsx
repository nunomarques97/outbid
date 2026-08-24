import { PenLine } from 'lucide-react'
import { useVisualStyle } from '@/hooks/useVisualStyle'

/**
 * Dev/design-review control for comparing the new default homepage style
 * against the current production ("legacy") style. Presentation preference
 * only — persisted client-side, never touches app data, auth, or backend
 * state. Deliberately placed in the footer rather than a settings page:
 * discreet, not part of the primary conversion flow.
 */
export function StyleToggle() {
  const { style, toggle } = useVisualStyle()
  const isNew = style === 'new'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isNew ? 'legacy' : 'new'} site style`}
      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg-muted transition-colors hover:border-fg-subtle hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <PenLine className="h-3 w-3" />
      {isNew ? 'New style' : 'Legacy style'}
    </button>
  )
}
