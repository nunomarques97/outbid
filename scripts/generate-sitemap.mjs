#!/usr/bin/env node
/**
 * Generates public/sitemap.xml and public/llms.txt at build time.
 *
 * Repcastr is deployed as static assets to Cloudflare Workers (no Worker
 * script — see wrangler.jsonc) so nothing can be served per-request; both
 * files must be pre-generated and shipped as part of dist/. Run via
 * `npm run seo:generate` (wired into `npm run build` so they're always
 * regenerated from live data on every real build, never left stale) or
 * standalone for local testing.
 *
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local (falling
 * back to .env) the same way the app itself does. If neither is present,
 * still generates both files with the static routes only, rather than
 * failing the build — this script never touches production data, it only
 * reads public company/category rows with the public anon key.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SITE_URL = 'https://repcastr.com'

// /search is deliberately excluded — it's set to noindex in-app (every query
// is a near-duplicate URL), so it shouldn't appear in the sitemap either.
const STATIC_ROUTES = ['/', '/categories', '/deals', '/top-bidders', '/privacy', '/terms']

function loadEnv() {
  const env = {}
  for (const file of ['.env.local', '.env']) {
    const path = join(ROOT, file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)?\s*$/)
      if (!match) continue
      const key = match[1]
      if (key in env) continue
      let value = (match[2] ?? '').trim()
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      env[key] = value
    }
  }
  return env
}

async function fetchEntities() {
  const env = loadEnv()
  const url = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.warn('[seo] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY not found — generating with static routes only.')
    return { categories: [], companies: [] }
  }

  const supabase = createClient(url, anonKey)

  const [{ data: categories, error: categoriesError }, { data: companies, error: companiesError }] = await Promise.all([
    supabase.from('categories').select('slug, name, description, created_at').eq('is_archived', false).order('name'),
    supabase.from('companies').select('slug, updated_at').order('slug'),
  ])
  if (categoriesError) throw categoriesError
  if (companiesError) throw companiesError

  return { categories: categories ?? [], companies: companies ?? [] }
}

function xmlEscape(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildSitemap({ categories, companies }) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    ...STATIC_ROUTES.map((path) => ({ loc: path, lastmod: today, priority: path === '/' ? '1.0' : '0.7' })),
    ...categories.map((c) => ({
      loc: `/categories/${c.slug}`,
      lastmod: (c.created_at ?? today).slice(0, 10),
      priority: '0.8',
    })),
    ...companies.map((c) => ({
      loc: `/companies/${c.slug}`,
      lastmod: (c.updated_at ?? today).slice(0, 10),
      priority: '0.6',
    })),
  ]

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${xmlEscape(SITE_URL + u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

function buildLlmsTxt({ categories }) {
  const categoryLines = categories.length
    ? categories.map((c) => `- [${c.name}](${SITE_URL}/categories/${c.slug})${c.description ? `: ${c.description}` : ''}`).join('\n')
    : '(categories are loaded dynamically — see /categories on the live site)'

  return `# Repcastr

> Repcastr is a company discovery and reputation platform. Users browse, review, and vote on companies; companies get public profiles and compete for visibility through category rankings that combine real community votes with openly labeled, transparent sponsored placement — higher bids win higher sponsored positions, but sponsored and community (organic) rankings are always shown separately and never confused with each other.

## What Repcastr does

- **Discovery**: browse companies by category, or search across companies, categories, reviews, and deals.
- **Community rankings**: companies are ranked organically by real user votes — never purchasable.
- **Reviews & ratings**: users leave reviews and ratings on company profiles.
- **Sponsored placement**: companies can bid, in the open, for extra visibility in a category or on the homepage. Every sponsored spot is labeled "Sponsored" and every bid amount is public.
- **Deals**: companies can publish live offers, discoverable per-category and site-wide.
- **Public company profiles**: each company has a profile with its description, category memberships, community rank, review history, and (if applicable) current sponsored status.

## Main categories

${categoryLines}

## Important public pages

- [Homepage](${SITE_URL}/) — live rankings and category discovery
- [Categories](${SITE_URL}/categories) — full category index
- [Top Bidders](${SITE_URL}/top-bidders) — companies currently bidding for sponsored visibility, cross-category
- [Deals](${SITE_URL}/deals) — live offers from companies across every category
- [Search](${SITE_URL}/search) — search companies, categories, reviews, and deals
- Company profiles: ${SITE_URL}/companies/:slug
- Category rankings: ${SITE_URL}/categories/:slug

## Notes for automated systems

- Sponsored rankings are always explicitly labeled and never presented as organic/community rankings.
- Company and category data reflected here comes directly from Repcastr's live public dataset — nothing on this page is fabricated.
- Advertiser dashboards, billing, and account-management pages are private and intentionally excluded from indexing (see /robots.txt).
`
}

async function main() {
  const entities = await fetchEntities()
  writeFileSync(join(ROOT, 'public', 'sitemap.xml'), buildSitemap(entities))
  writeFileSync(join(ROOT, 'public', 'llms.txt'), buildLlmsTxt(entities))
  console.log(
    `[seo] Wrote public/sitemap.xml (${STATIC_ROUTES.length} static + ${entities.categories.length} category + ${entities.companies.length} company URLs) and public/llms.txt (${entities.categories.length} categories listed).`,
  )
}

main().catch((err) => {
  console.error('[seo] Failed to generate sitemap/llms.txt:', err)
  process.exit(1)
})
