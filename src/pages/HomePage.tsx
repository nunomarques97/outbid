import { useVisualStyle } from '@/hooks/useVisualStyle'
import { NewHomePage } from './NewHomePage'
import { LegacyHomePage } from './LegacyHomePage'

/** Container: picks which homepage composition to render based on the visual-style preference. All data/business logic is shared — only section choice/order differs between the two views. */
export function HomePage() {
  const { style } = useVisualStyle()
  return style === 'legacy' ? <LegacyHomePage /> : <NewHomePage />
}
