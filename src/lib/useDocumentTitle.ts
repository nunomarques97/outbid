import { useEffect } from 'react'

const SITE_NAME = 'Repcastr'

/** Sets the tab/browser title for the current route. Pass undefined while data is still loading to leave the previous title in place rather than flashing a generic one. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} — ${SITE_NAME}`
    return () => {
      document.title = previous
    }
  }, [title])
}
