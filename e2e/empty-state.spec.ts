import { test, expect, type Page } from '@playwright/test'

/**
 * Part 13 — zero-content ("day one") experience. Real staging data is
 * never touched for this: every content table (companies, bids, reviews,
 * deals, trends, battles, votes, rating summaries) is intercepted at the
 * network layer and answered with an empty array, so the app renders
 * exactly as it would against a genuinely empty database. Reference data
 * (categories, placements) is left real, since those exist independently
 * of whether any company/bid/review/deal has been created yet.
 */

const EMPTY_TABLES = [
  'companies',
  'company_categories',
  'bids',
  'deals',
  'trends',
  'trend_companies',
  'battles',
  'battle_votes',
  'reviews',
  'company_rating_summary',
  'deal_claim_counts',
  'company_votes',
  'saved_companies',
]

async function mockEmptyContent(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const table = url.pathname.split('/rest/v1/')[1]?.split('?')[0]
    if (table && EMPTY_TABLES.includes(table)) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
      return
    }
    await route.continue()
  })
}

/** No stray "NaN"/"undefined" text anywhere a number or optional field render bug would leak one. */
async function expectNoBrokenValues(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/\bNaN\b/)
  expect(text).not.toMatch(/\bundefined\b/)
}

test.describe('Empty-state / zero-content experience', () => {
  test('homepage: hero, empty top bidders, CTA, empty live deals, footer — no broken content', async ({ page }) => {
    await mockEmptyContent(page)
    await page.goto('/')

    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('heading').first()).toBeVisible()

    await expect(page.getByText('No sponsored bidders yet')).toBeVisible()
    await expect(page.getByText('Be the first company to compete for sponsored visibility.')).toBeVisible()

    await expect(page.getByText('Have a company?').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create your company profile' })).toBeVisible()

    // With zero companies, "Rate a random company" has nothing to send you
    // to — it must disable itself rather than navigate somewhere broken.
    await expect(page.getByRole('button', { name: 'Rate a random company' })).toBeDisabled()

    await expect(page.getByText('No live deals right now')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create a deal' })).toBeVisible()

    // TopRatedSection renders nothing (not an empty box) when there is no
    // rated content — confirm it doesn't crash the rest of the page.
    await expect(page.getByRole('heading', { name: 'Trending now' })).toBeVisible()
    await expect(page.getByText('Nothing trending yet')).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Battle of the day' })).toBeVisible()
    await expect(page.getByText('Coming soon', { exact: true })).toBeVisible()

    await expect(page.getByRole('contentinfo')).toBeVisible()
    await expectNoBrokenValues(page)
  })

  test('"Create your company profile" CTA still routes correctly with zero companies', async ({ page }) => {
    await mockEmptyContent(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Create your company profile' }).click()
    await expect(page.getByRole('dialog').getByText('Sign in to create your company')).toBeVisible()
  })

  test('Categories page: category list still exists and shows honest zero counts', async ({ page }) => {
    await mockEmptyContent(page)
    await page.goto('/categories')
    await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible()
    await expect(page.getByText('0 companies ranked').first()).toBeVisible()
    await expectNoBrokenValues(page)
  })

  test('Category detail: zero-company category shows an intentional empty state, not a broken ranking', async ({ page }) => {
    await mockEmptyContent(page)
    await page.goto('/categories/technology')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Nobody is here yet.')).toBeVisible()
    await expect(page.getByText('0 companies')).toBeVisible()
    await expect(page.getByText('0 sponsored spots')).toBeVisible()
    await expectNoBrokenValues(page)
  })

  test('Top Bidders page: zero bidders is a real empty state, no fake company', async ({ page }) => {
    await mockEmptyContent(page)
    await page.goto('/top-bidders')
    await expect(page.getByRole('heading', { name: 'Top Bidders' })).toBeVisible()
    await expect(page.getByText('No active sponsored bids right now')).toBeVisible()
    await expectNoBrokenValues(page)
  })

  test('Deals page: zero deals has a useful empty state and the advertiser CTA still works', async ({ page }) => {
    await mockEmptyContent(page)
    await page.goto('/deals')
    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible()
    await expect(page.getByText('No deals in this category right now.')).toBeVisible()
  })

  test('Search: zero companies/users/categories renders no broken result cards', async ({ page }) => {
    await mockEmptyContent(page)
    await page.goto('/search?q=nothingmatcheshere')
    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
    await expect(page.getByText(/No results for/)).toBeVisible()
    await expectNoBrokenValues(page)
  })
})
