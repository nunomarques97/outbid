import { test, expect } from '@playwright/test'
import { signInAsNewUser, signIn, dbQuery, directApiRequest, escapeSql, deleteTestCompany, type TestUser } from './support/fixtures'

/**
 * Parts 5 & 6 — one-company-per-account and the 1-2 category rule.
 * Authoritative invariant under test: ONE USER ACCOUNT = ONE COMPANY, and a
 * company holds 1-2 categories, never more, never fewer, enforced by real
 * DB constraints (company_members_user_id_unique, and the deferred
 * min/max-category trigger from 20260822110000_category_min_max_deferred.sql)
 * — not merely by the UI. The "direct API" tests below authenticate as the
 * real signed-in test user and hit PostgREST/RPC directly, bypassing this
 * app's own client code, specifically to prove the database itself (not
 * just the UI) rejects these cases.
 */

let advertiser: TestUser
let companySlug: string
let companyId: string

test.describe.serial('Advertiser: one company, 1-2 categories', () => {
  test.afterAll(() => {
    if (companyId) deleteTestCompany(companyId)
  })


  test('a fresh advertiser account has no company', async ({ page }) => {
    advertiser = await signInAsNewUser(page, 'E2E Advertiser')
    await page.goto('/dashboard')
    await expect(page.getByText("You don't manage a company yet")).toBeVisible()
  })

  test('create exactly one company with one category', async ({ page }) => {
    await signIn(page, advertiser)
    companySlug = `e2e-advertiser-co-${Date.now()}`
    await page.goto('/dashboard/new')
    await page.getByPlaceholder('e.g. Flowstack').fill(companySlug)
    await page.getByPlaceholder('One line describing what you do').fill('An E2E test company')
    await page
      .getByPlaceholder('What does your company do, and who is it for?')
      .fill('Created by the Phase 37 automated E2E suite to test the advertiser journey end to end.')
    await page.getByPlaceholder('example.com').fill('example.com')
    await page.getByRole('button', { name: 'Automotive' }).click()
    await page.getByRole('button', { name: 'Create company' }).click()

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const rows = dbQuery<{ id: string; slug: string }>(
      `select id, slug from companies where slug ilike '${escapeSql(companySlug)}%' order by created_at desc limit 1;`,
    )
    expect(rows.length).toBe(1)
    companyId = rows[0].id
    companySlug = rows[0].slug
  })

  test('dashboard loads the one company; /dashboard/new no longer offers a create form', async ({ page }) => {
    await signIn(page, advertiser)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.goto('/dashboard/new')
    await expect(page.getByText('You already manage')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. Flowstack')).toHaveCount(0)
  })

  test('a direct second-company API call is still rejected by the database', async ({ page }) => {
    await signIn(page, advertiser)
    await page.goto('/dashboard')
    const res = await directApiRequest(page, '/rest/v1/companies', {
      method: 'POST',
      body: {
        slug: `e2e-second-attempt-${Date.now()}`,
        name: 'Should never exist',
        initials: 'SN',
        logo_color: '#000000',
        tagline: 'x',
        description: 'Attempting a second company for the same account via a direct API call.',
        website: 'example.com',
        founded_year: 2024,
      },
    })
    expect(res.status, JSON.stringify(res.body)).toBeGreaterThanOrEqual(400)

    const rows = dbQuery<{ count: string }>(
      `select count(*)::text as count from company_members where user_id = (select id from auth.users where email = '${escapeSql(advertiser.email)}');`,
    )
    expect(rows[0].count).toBe('1')
  })

  test('add a second category; the UI blocks selecting a third', async ({ page }) => {
    await signIn(page, advertiser)
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Edit' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Finance' }).click()
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()

    const rows = dbQuery<{ category_id: string }>(
      `select category_id from company_categories where company_id = '${companyId}';`,
    )
    expect(rows.length).toBe(2)

    // Reopen on a fresh load (not just a re-click): forces the dashboard's
    // company query to refetch, so the dialog reliably seeds from the
    // just-saved 2 categories rather than a stale cached 1-category value.
    await page.reload()
    await page.getByRole('button', { name: 'Edit' }).click()
    const reopened = page.getByRole('dialog')
    const thirdChip = reopened.getByRole('button', { name: 'Education' })
    await expect(thirdChip).toBeDisabled()
    await reopened.getByRole('button', { name: 'Cancel' }).click()
  })

  test('a direct RPC attempt to set 3 categories is rejected server-side', async ({ page }) => {
    await signIn(page, advertiser)
    const categories = dbQuery<{ id: string }>(`select id from categories where is_archived = false limit 3;`)
    expect(categories.length).toBe(3)

    const res = await directApiRequest(page, '/rest/v1/rpc/set_company_categories', {
      method: 'POST',
      body: { p_company_id: companyId, p_category_ids: categories.map((c) => c.id) },
    })
    expect(res.status, JSON.stringify(res.body)).toBeGreaterThanOrEqual(400)

    const rows = dbQuery<{ count: string }>(
      `select count(*)::text as count from company_categories where company_id = '${companyId}';`,
    )
    expect(rows[0].count).toBe('2')
  })
})
