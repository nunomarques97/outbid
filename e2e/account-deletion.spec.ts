import { test, expect } from '@playwright/test'
import { signInAsNewUser, signIn, headerSignInButton, dbQuery, findUserIdByEmail, deleteTestCompany, type TestUser } from './support/fixtures'

/**
 * Part 12 — account deletion, both branches: a user with no company (real
 * self-service delete) and a user who manages a company (server-blocked,
 * manual-contact path only). See supabase/functions/delete-account and
 * src/features/profile/DeleteAccountDialog.tsx.
 */

test.describe.serial('Account deletion — no company', () => {
  let user: TestUser
  let userId: string

  test('delete a no-company account end to end', async ({ page }) => {
    user = await signInAsNewUser(page, 'E2E Deletable User')
    userId = findUserIdByEmail(user.email)!

    await page.getByRole('button', { name: 'Account menu' }).click()
    // exact: true — a dashboard page also has its own "View public profile"
    // link, which contains "Profile" too and can be on screen at the same time.
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await page.getByRole('button', { name: 'Delete account' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('This permanently deletes your account')).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete my account' }).click()

    await expect(page.getByText('Your account has been deleted.')).toBeVisible()
    await expect(page).toHaveURL('/')
    // Signed out: the header shows "Sign in" again, not the account menu.
    await expect(headerSignInButton(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0)
  })

  test('the deleted user cannot sign back in with the old credentials', async ({ page }) => {
    await page.goto('/')
    await headerSignInButton(page).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('Email').fill(user.email)
    await dialog.getByPlaceholder('Password').fill(user.password)
    await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
    // Sign-in fails — the dialog stays open rather than reaching the account menu.
    await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0)
    await expect(dialog).toBeVisible()
  })

  test('the account row is actually gone, and dependent rows went with it', async () => {
    const rows = dbQuery<{ id: string }>(`select id from auth.users where id = '${userId}';`)
    expect(rows.length).toBe(0)

    const profileRows = dbQuery<{ id: string }>(`select id from profiles where id = '${userId}';`)
    expect(profileRows.length).toBe(0)
  })
})

test.describe.serial('Account deletion — company owner', () => {
  let owner: TestUser
  let companyId: string

  // This company deliberately survives every test in this block (that's
  // the point — deletion must stay blocked) but doesn't need to survive
  // the whole suite; the owning account is left as harmless orphaned test
  // data (see the file-level note on real staging accounts), same as every
  // other spec file's throwaway users.
  test.afterAll(() => {
    if (companyId) deleteTestCompany(companyId)
  })

  test('an advertiser who manages a company cannot self-delete', async ({ page }) => {
    owner = await signInAsNewUser(page, 'E2E Owner Cannot Delete')
    const slug = `e2e-delete-block-co-${Date.now()}`

    await page.goto('/dashboard/new')
    await page.getByPlaceholder('e.g. Flowstack').fill(slug)
    await page.getByPlaceholder('One line describing what you do').fill('An E2E deletion-block test company')
    await page
      .getByPlaceholder('What does your company do, and who is it for?')
      .fill('Created by the Phase 37 automated E2E suite to test the account-deletion block for company owners.')
    await page.getByPlaceholder('example.com').fill('example.com')
    await page.getByRole('button', { name: 'Automotive' }).click()
    await page.getByRole('button', { name: 'Create company' }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 })

    const rows = dbQuery<{ id: string }>(`select id from companies where slug ilike '${slug}%' limit 1;`)
    companyId = rows[0].id

    await page.getByRole('button', { name: 'Account menu' }).click()
    // exact: true — a dashboard page also has its own "View public profile"
    // link, which contains "Profile" too and can be on screen at the same time.
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await page.getByRole('button', { name: 'Delete account' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('You manage a company. Account deletion requires a manual request.')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Delete my account' })).toHaveCount(0)
    await expect(dialog.getByRole('link')).toContainText('@')
    // .first(): the dialog's own explicit "Close" button and Radix's built-in
    // X icon (also aria-label="Close") both match — either closes the dialog.
    await dialog.getByRole('button', { name: 'Close' }).first().click()
  })

  test('the server independently blocks deletion even if the dialog were bypassed', async ({ page }) => {
    await signIn(page, owner)
    const accessToken = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
          const raw = localStorage.getItem(key)
          if (raw) return (JSON.parse(raw) as { access_token: string }).access_token
        }
      }
      return null
    })
    expect(accessToken).toBeTruthy()

    const res = await page.request.post('https://vjceycspucjkvvisnzwy.supabase.co/functions/v1/delete-account', {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: 'sb_publishable_cpWBGchQT6jdCyEWxBT_sQ_VnVPz_yF' },
    })
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('manual request')

    const stillExists = dbQuery<{ id: string }>(`select id from companies where id = '${companyId}';`)
    expect(stillExists.length).toBe(1)
    const userStillExists = dbQuery<{ id: string }>(`select id from auth.users where email = '${owner.email}';`)
    expect(userStillExists.length).toBe(1)
  })
})
