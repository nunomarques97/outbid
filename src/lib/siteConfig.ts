export const SITE_NAME = 'Repcastr'

/**
 * Canonical production origin, used to build absolute canonical/OG URLs.
 * `repcastr.com` is Repcastr's real, already-DNS-configured production
 * domain — override via VITE_SITE_URL only for a differently-domained
 * deployment (e.g. a preview environment), never as a placeholder.
 */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/+$/, '') || 'https://repcastr.com'
)
