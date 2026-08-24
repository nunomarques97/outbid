import { useEffect } from 'react'
import { SITE_NAME, SITE_URL } from './siteConfig'

export interface SeoOptions {
  /** Page-specific title; the final tab title is `${title} — Repcastr`. Pass undefined while data is still loading to leave the previous title in place rather than flashing a generic one. */
  title?: string
  /** Overrides the shared meta/OG/Twitter description for this route. Restored on unmount. */
  description?: string
  /** Route path (e.g. `/companies/acme`) used to build the absolute canonical URL. Omit to leave whatever canonical link is already on the page. */
  canonicalPath?: string
  /** Set true for a page that exists but shouldn't be indexed (e.g. an internal search results page, or someone else's private profile). */
  noindex?: boolean
}

function swapMetaContent(selector: string, value: string): (() => void) | undefined {
  const el = document.querySelector(selector)
  if (!el) return undefined
  const previous = el.getAttribute('content')
  el.setAttribute('content', value)
  return () => {
    if (previous !== null) el.setAttribute('content', previous)
  }
}

/**
 * Single place every route manages its `<title>`, meta description, OG/Twitter
 * description, canonical link, and robots directive. Extends the app's one
 * existing SEO mechanism (title-only `useDocumentTitle`) rather than adding a
 * second system — every field is optional and independently restored on
 * unmount, so a page can set just a title, just a description, or all of it.
 */
export function useSeo({ title, description, canonicalPath, noindex }: SeoOptions) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} — ${SITE_NAME}`
    return () => {
      document.title = previous
    }
  }, [title])

  useEffect(() => {
    if (!description) return
    const restores = [
      swapMetaContent('meta[name="description"]', description),
      swapMetaContent('meta[property="og:description"]', description),
      swapMetaContent('meta[name="twitter:description"]', description),
    ].filter((fn): fn is () => void => Boolean(fn))
    return () => {
      for (const restore of restores) restore()
    }
  }, [description])

  useEffect(() => {
    if (!canonicalPath) return
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const created = !link
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    const previous = link.getAttribute('href')
    link.setAttribute('href', `${SITE_URL}${canonicalPath}`)
    return () => {
      if (created) {
        link?.remove()
      } else if (previous !== null) {
        link?.setAttribute('href', previous)
      }
    }
  }, [canonicalPath])

  useEffect(() => {
    if (!noindex) return
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const created = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'robots')
      document.head.appendChild(meta)
    }
    const previous = meta.getAttribute('content')
    meta.setAttribute('content', 'noindex, follow')
    return () => {
      if (created) {
        meta?.remove()
      } else if (previous !== null) {
        meta?.setAttribute('content', previous)
      }
    }
  }, [noindex])
}
