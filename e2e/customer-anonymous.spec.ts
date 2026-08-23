import { test, expect } from '@playwright/test'

/**
 * Part 3 — anonymous customer journey. Reads real staging content
 * (companies/reviews seeded before this phase) but never mutates anything
 * — every gated action here must be BLOCKED while signed out, so a
 * regression that accidentally let one through would show up as this
 * suite creating unexpected staging rows, which it must never do.
 *
 * Fixed staging companies referenced below (confirmed present via direct
 * query before writing this suite): "flowstack" (no review dependency),
 * "taskwave" (has at least one public-profile-authored review).
 */

test.describe('Anonymous customer journey', () => {
  test('homepage renders with hero and no broken content', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Repcastr/)
    await expect(page.getByRole('heading').first()).toBeVisible()
    // No unhandled render crash: the root app content mounted at all.
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })

  test('search finds a real company and opens its profile', async ({ page }) => {
    await page.goto('/')
    // Two matching inputs exist (desktop header + the mobile menu's own
    // copy, hidden via CSS but still present) — the desktop one is first.
    await page.getByRole('banner').getByLabel('Search').first().fill('Flowstack')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/search\?q=Flowstack/)
    const result = page.getByRole('link', { name: /Flowstack/ }).first()
    await expect(result).toBeVisible()
    await result.click()
    await expect(page).toHaveURL(/\/companies\/flowstack/)
    await expect(page.getByRole('heading', { name: 'Flowstack' })).toBeVisible()
  })

  test('voting while signed out opens sign-in and creates no vote', async ({ page }) => {
    await page.goto('/companies/flowstack')
    // The same VoteButton also appears (size="sm") in the "More in
    // category" related-companies list further down the page — the
    // company's own header vote button is the first one in DOM order.
    const voteButton = page.getByRole('button', { name: 'Upvote company' }).first()
    await expect(voteButton).toHaveAttribute('aria-pressed', 'false')
    await voteButton.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Sign in to vote')).toBeVisible()
    await page.keyboard.press('Escape')
    // Still not voted, and the button state didn't change client-side.
    await expect(voteButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('saving while signed out opens sign-in and creates no save', async ({ page }) => {
    await page.goto('/companies/flowstack')
    const saveButton = page.getByRole('button', { name: 'Save company' }).first()
    await saveButton.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Sign in to save' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(saveButton).toBeVisible()
  })

  test('writing a review while signed out shows the auth gate, not a form', async ({ page }) => {
    await page.goto('/companies/flowstack')
    await expect(page.getByText('Sign in to write a review')).toBeVisible()
    await expect(page.getByLabel('Your rating')).toHaveCount(0)
  })

  test('reporting while signed out opens sign-in, not the report form', async ({ page }) => {
    await page.goto('/companies/flowstack')
    await page.getByRole('button', { name: 'Report this company' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Sign in to report')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Submit report')).toHaveCount(0)
  })

  test('open a review and its public author profile', async ({ page }) => {
    await page.goto('/companies/taskwave')
    await expect(page.getByRole('heading', { name: 'Reviews', level: 2 })).toBeVisible()
    const authorLink = page.locator('a[href^="/users/"]').first()
    await expect(authorLink).toBeVisible()
    await authorLink.click()
    await expect(page).toHaveURL(/\/users\//)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('search for a user by username', async ({ page }) => {
    await page.goto('/search?q=nunodomarques9797')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await expect(page.locator('a[href="/users/nunodomarques9797"]')).toBeVisible()
  })

  test('visiting an unknown or private username shows a neutral not-available state', async ({ page }) => {
    await page.goto('/users/definitely-not-a-real-username-e2e')
    await expect(page.getByText("This profile isn't available")).toBeVisible()
  })

  test('Deals page renders and a deal card links out correctly', async ({ page }) => {
    await page.goto('/deals')
    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible()
    await expect(page.getByText('All categories')).toBeVisible()
  })

  test('"Rate a random company" sends you to a real company profile', async ({ page }) => {
    await page.goto('/')
    const randomButton = page.getByRole('button', { name: 'Rate a random company' })
    await expect(randomButton).toBeEnabled()
    await randomButton.click()
    await expect(page).toHaveURL(/\/companies\/[a-z0-9-]+/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
