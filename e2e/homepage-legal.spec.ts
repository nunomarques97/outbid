import { test, expect } from '@playwright/test'

/**
 * Part 14 — homepage section presence (all the sections the brief expects
 * exist and render without error). NOTE on ordering: the brief's intended
 * order lists Hero, then Top Bidders, then the company-creation CTA. The
 * actual shipped order (src/pages/HomePage.tsx) is Hero, then the
 * company-creation CTA, then Top Bidders. This is a real, pre-existing
 * discrepancy from the brief — flagged here rather than "fixed" by
 * reordering, per this phase's own instruction not to redesign the
 * homepage unless E2E reveals a genuinely broken state (a swapped section
 * order is not broken content, just a different order than specified).
 *
 * Part 15/16 — legal page finalization: Terms/Privacy reflect the real
 * confirmed operator details, contact addresses, and policy decisions
 * supplied for this phase, with only genuinely undecided items left as
 * explicit placeholders.
 */

test.describe('Homepage structure', () => {
  test('every expected homepage section is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Top bidders' })).toBeVisible()
    await expect(page.getByText('Have a company?').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Trending now' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Battle of the day' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Live deals' })).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })
})

test.describe('Legal pages', () => {
  test('Privacy: real operator identity, address framing, and contact addresses', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByText('Nuno Daniel Oliveira Marques')).toBeVisible()
    await expect(page.getByText('Rua da Aldeia n.º 193, Longos, 4805-204')).toBeVisible()
    await expect(page.getByText('not a registered company address')).toBeVisible()
    await expect(page.getByText('is not published as a residential address')).toBeVisible()
    await expect(page.getByText('No Data Protection Officer (DPO) is currently designated.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'privacy@repcastr.com' }).first()).toBeVisible()
    await expect(page.locator('a[href^="mailto:nuno"]')).toHaveCount(0)
    await expect(page.getByText('13 and older')).toBeVisible()
  })

  test('Terms: governing law, contact, and refund/suspension policy are filled in', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByText('governed by the laws of Portugal')).toBeVisible()
    await expect(page.getByRole('link', { name: 'support@repcastr.com' }).first()).toBeVisible()
    await expect(page.getByText(/generally.*non-refundable/)).toBeVisible()
    await expect(page.getByText('temporarily restrict or terminate an account')).toBeVisible()
    await expect(page.locator('a[href^="mailto:nuno"]')).toHaveCount(0)
  })

  test('remaining, genuinely undecided legal items are still explicit placeholders, not invented', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByText('liability limitation, reviewed by counsel')).toBeVisible()

    await page.goto('/privacy')
    await expect(page.getByText('formal data-subject-request process and response timeline')).toBeVisible()
  })

  test('footer links to Privacy and Terms work from any page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click()
    await expect(page).toHaveURL(/\/privacy/)
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Terms' }).click()
    await expect(page).toHaveURL(/\/terms/)
  })
})
