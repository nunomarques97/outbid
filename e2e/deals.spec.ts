import { test, expect } from '@playwright/test'
import { signInAsNewUser, signIn, signOut, deleteTestCompanyBySlug, type TestUser } from './support/fixtures'

/**
 * Part 9 — deal journey: advertiser creates/edits/expires a deal, customer
 * watches/visits it, and the "Have a company? Create a deal" CTA routes
 * correctly for all three visitor states.
 *
 * Homepage "Live deals" only features the 3 soonest-to-expire active deals
 * (see getActiveDealsForDisplay, sorted by expiresAt ascending) out of
 * however many real deals already exist on staging — so the deal created
 * here is deliberately given a near-term (tomorrow) expiry, which reliably
 * sorts ahead of longer-running real staging deals without needing to
 * touch/delete any of them.
 */

let advertiser: TestUser
let companySlug: string
const dealTitle = `E2E test deal ${Date.now()}`

function tomorrow(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

function yesterday(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

test.describe.serial('Deal journey', () => {
  test.afterAll(() => {
    if (companySlug) deleteTestCompanyBySlug(companySlug)
  })


  test('advertiser creates a deal', async ({ page }) => {
    advertiser = await signInAsNewUser(page, 'E2E Deal Advertiser')
    companySlug = `e2e-deal-co-${Date.now()}`

    await page.goto('/dashboard/new')
    await page.getByPlaceholder('e.g. Flowstack').fill(companySlug)
    await page.getByPlaceholder('One line describing what you do').fill('An E2E deal test company')
    await page
      .getByPlaceholder('What does your company do, and who is it for?')
      .fill('Created by the Phase 37 automated E2E suite to test the deal journey end to end.')
    await page.getByPlaceholder('example.com').fill('example.com')
    await page.getByRole('button', { name: 'Automotive' }).click()
    await page.getByRole('button', { name: 'Create company' }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 })

    await page.getByRole('tab', { name: 'Deals' }).click()
    await page.getByRole('button', { name: 'New deal' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Title').fill(dealTitle)
    await dialog.getByLabel('Discount label').fill('50% off')
    await dialog.getByLabel('Description').fill('An offer created by the Phase 37 E2E suite.')
    await dialog.getByLabel('Expires').fill(tomorrow())
    await dialog.getByRole('button', { name: 'Create deal' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText(dealTitle)).toBeVisible()
  })

  test('the deal appears on the company profile and on the homepage Live deals section', async ({ page }) => {
    await page.goto(`/companies/${companySlug}`)
    await expect(page.getByText(dealTitle)).toBeVisible()

    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Live deals' })).toBeVisible()
    await expect(page.getByText(dealTitle)).toBeVisible()
  })

  test('a customer can watch and visit the deal', async ({ page }) => {
    await signInAsNewUser(page, 'E2E Deal Customer')
    await page.goto(`/companies/${companySlug}`)

    await expect(page.getByRole('link', { name: 'Visit deal' })).toBeVisible()
    await page.getByRole('button', { name: 'Watch deal' }).click()
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible()
  })

  test('advertiser edits the deal and the change is reflected', async ({ page }) => {
    await signIn(page, advertiser)
    await page.goto('/dashboard?tab=deals')
    await page.getByRole('tabpanel').getByRole('button', { name: 'Edit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Discount label').fill('60% off')
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('60% off')).toBeVisible()
  })

  test('advertiser expires the deal; it disappears from homepage Live deals but stays on /deals as Expired', async ({ page }) => {
    await signIn(page, advertiser)
    await page.goto('/dashboard?tab=deals')
    await page.getByRole('tabpanel').getByRole('button', { name: 'Edit' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Expires').fill(yesterday())
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Expired')).toBeVisible()

    await page.goto('/')
    await expect(page.getByText(dealTitle)).toHaveCount(0)

    await page.goto('/deals')
    // Scoped to this test's own card (the title <p> is a direct child of
    // DealCard's root div): other expired deals — real or leftover from a
    // previous run — would otherwise make "Expired" ambiguous on this page.
    const card = page.getByText(dealTitle).locator('xpath=..')
    await expect(card).toBeVisible()
    await expect(card.getByRole('button', { name: 'Expired' })).toBeVisible()
  })

  test('"Have a company? Create a deal" CTA routes correctly for all three visitor states', async ({ page }) => {
    // Signed out -> opens sign-in, not a deal form.
    await page.goto('/')
    await page.getByRole('button', { name: 'Create a deal' }).first().click()
    await expect(page.getByRole('dialog').getByText('Sign in to create a deal')).toBeVisible()
    await page.keyboard.press('Escape')

    // Signed-in customer with no company -> /dashboard/new.
    await signInAsNewUser(page, 'E2E CTA Customer')
    await page.goto('/')
    await page.getByRole('button', { name: 'Create a deal' }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/new/)
    await signOut(page)

    // Signed-in advertiser -> straight to the Deals tab of their own dashboard.
    await signIn(page, advertiser)
    await page.goto('/')
    await page.getByRole('button', { name: 'Create a deal' }).first().click()
    await expect(page).toHaveURL(/\/dashboard\?tab=deals/)
  })
})
