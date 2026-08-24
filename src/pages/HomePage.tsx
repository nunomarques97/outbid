import { useVisualStyle } from '@/hooks/useVisualStyle'
import { useSeo } from '@/lib/useSeo'
import { NewHomePage } from './NewHomePage'
import { LegacyHomePage } from './LegacyHomePage'

/** Container: picks which homepage composition to render based on the visual-style preference. All data/business logic is shared — only section choice/order differs between the two views. */
export function HomePage() {
  const { style } = useVisualStyle()
  // Title/description are already correct as index.html's static defaults —
  // only the canonical link needs to be asserted explicitly here.
  useSeo({ canonicalPath: '/' })
  return style === 'legacy' ? <LegacyHomePage /> : <NewHomePage />
}
