import { test, expect } from '@playwright/test'
import { signInAsNewUser, signIn, dbQuery, directApiRequest, findUserIdByEmail, type TestUser } from './support/fixtures'

/**
 * Part 11 — reporting / trust & safety. Covers the real browser flow
 * (create a report on a review, company, and deal; duplicate rejection)
 * plus DB-level authoritative checks for what the UI has no way to
 * exercise directly: RLS isolation between two different reporters, and
 * that the report table has no client-reachable write/update path outside
 * create_report().
 */

let reporter: TestUser
let flowstackId: string
let reviewId: string

test.describe.serial('Reporting', () => {
  // Cleans up the one real review this suite creates on the shared
  // 'flowstack' company (plus reports against it) so repeated runs never
  // accumulate duplicate "Report this review" buttons on that page, which
  // would otherwise make the button locator in later tests ambiguous.
  test.afterAll(() => {
    if (!reviewId) return
    dbQuery(`delete from reports where target_type = 'review' and target_id = '${reviewId}';`)
    dbQuery(`delete from reviews where id = '${reviewId}';`)
  })


  test('setup: a review exists on a fresh company for this suite to report', async ({ page }) => {
    const rows = dbQuery<{ id: string }>(`select id from companies where slug = 'flowstack' limit 1;`)
    flowstackId = rows[0].id

    await signInAsNewUser(page, 'E2E Reported Reviewer')
    await page.goto('/companies/flowstack')
    await page.getByRole('button', { name: 'Write a review' }).click()
    await page.getByRole('button', { name: 'Rate 3 out of 5 stars' }).click()
    await page.getByLabel('Title').fill('A review created only to be reported')
    await page.getByLabel('Review', { exact: true }).fill('This review exists solely as a Phase 37 E2E reporting-flow fixture.')
    await page.getByRole('button', { name: 'Post review' }).click()
    await expect(page.getByText('A review created only to be reported')).toBeVisible()

    const reviewRows = dbQuery<{ id: string }>(
      `select id from reviews where company_id = '${flowstackId}' and title = 'A review created only to be reported';`,
    )
    reviewId = reviewRows[0].id
  })

  test('signed-out report action opens sign-in, not the report form', async ({ page }) => {
    await page.goto('/companies/flowstack')
    await page.getByRole('button', { name: 'Report this review' }).click()
    await expect(page.getByRole('dialog').getByText('Sign in to report')).toBeVisible()
  })

  test('a signed-in user can report the review', async ({ page }) => {
    reporter = await signInAsNewUser(page, 'E2E Reporter')
    await page.goto('/companies/flowstack')

    await page.getByRole('button', { name: 'Report this review' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Reason').selectOption('fake_or_misleading')
    await dialog.getByLabel('Description (optional)').fill('E2E test report — safe to ignore/delete.')
    await dialog.getByRole('button', { name: 'Submit report' }).click()
    await expect(page.getByText('Thanks. Your report has been submitted.')).toBeVisible()

    const reporterId = findUserIdByEmail(reporter.email)
    const rows = dbQuery<{ status: string; reason: string }>(
      `select status, reason from reports where reporter_user_id = '${reporterId}' and target_type = 'review' and target_id = '${reviewId}';`,
    )
    expect(rows.length).toBe(1)
    expect(rows[0].status).toBe('pending')
    expect(rows[0].reason).toBe('fake_or_misleading')
  })

  test('a duplicate pending report on the same review is rejected', async ({ page }) => {
    await signIn(page, reporter)
    await page.goto('/companies/flowstack')
    await page.getByRole('button', { name: 'Report this review' }).click()
    const dialog = page.getByRole('dialog')
    // Checked via the RPC's own response rather than the toast: sonner's
    // default auto-dismiss can outrace a fixed-timeout visibility check.
    const responsePromise = page.waitForResponse((res) => res.url().includes('/rest/v1/rpc/create_report'))
    await dialog.getByRole('button', { name: 'Submit report' }).click()
    const response = await responsePromise
    expect(response.status()).toBeGreaterThanOrEqual(400)
    const body = (await response.json()) as { message?: string }
    expect(body.message ?? '').toMatch(/already have a pending report/i)

    const reporterId = findUserIdByEmail(reporter.email)
    const rows = dbQuery<{ count: string }>(
      `select count(*)::text as count from reports where reporter_user_id = '${reporterId}' and target_type = 'review' and target_id = '${reviewId}';`,
    )
    expect(rows[0].count).toBe('1')
  })

  test('reporting a company and a deal both work through the same dialog', async ({ page }) => {
    await signIn(page, reporter)
    await page.goto('/companies/flowstack')
    await page.getByRole('button', { name: 'Report this company' }).click()
    let dialog = page.getByRole('dialog')
    await dialog.getByLabel('Reason').selectOption('other')
    await dialog.getByRole('button', { name: 'Submit report' }).click()
    await expect(page.getByText('Thanks. Your report has been submitted.')).toBeVisible()

    await page.goto('/companies/ember-oak-coffee')
    await page.getByRole('button', { name: 'Report this deal' }).click()
    dialog = page.getByRole('dialog')
    await dialog.getByLabel('Reason').selectOption('spam')
    await dialog.getByRole('button', { name: 'Submit report' }).click()
    await expect(page.getByText('Thanks. Your report has been submitted.')).toBeVisible()
  })

  test('the reporter can read their own report; a different user cannot', async ({ page }) => {
    // Via the real authenticated REST path (the `authenticated` PostgREST
    // role under each user's real JWT) — see directApiRequest's own
    // comment for why dbQuery cannot be used to test this.
    await signIn(page, reporter)
    const own = await directApiRequest(page, '/rest/v1/reports?target_type=eq.review&select=id', { method: 'GET' })
    expect(own.status).toBe(200)
    expect(Array.isArray(own.body) ? own.body.length : 0).toBeGreaterThan(0)

    await signInAsNewUser(page, 'E2E Other Reporter')
    const others = await directApiRequest(page, '/rest/v1/reports?select=id', { method: 'GET' })
    expect(others.status).toBe(200)
    // RLS scopes every authenticated caller to only their own reports —
    // otherReporter has filed none, so their unfiltered read is empty even
    // though reporter's reports genuinely exist in the table.
    expect(others.body).toEqual([])
  })

  test('an authenticated client cannot update a report status directly', async ({ page }) => {
    await signIn(page, reporter)
    const rows = dbQuery<{ id: string }>(
      `select id from reports where reporter_user_id = (select id from auth.users where email = '${reporter.email.replace(/'/g, "''")}') and target_type = 'review' limit 1;`,
    )
    const reportId = rows[0].id

    const res = await directApiRequest(page, `/rest/v1/reports?id=eq.${reportId}`, {
      method: 'PATCH',
      body: { status: 'resolved' },
    })
    // PostgREST returns 200 with an empty array when RLS silently filters
    // the row out of an UPDATE's WHERE-matched set (no policy permits it),
    // rather than a 4xx — either way, nothing may actually change.
    if (res.status < 300) {
      expect(Array.isArray(res.body) ? res.body.length : 1).toBe(0)
    }
    const after = dbQuery<{ status: string }>(`select status from reports where id = '${reportId}';`)
    expect(after[0].status).toBe('pending')
  })

  test('create_report rejects an invalid target type, target id, and reason', async ({ page }) => {
    await signIn(page, reporter)

    const badType = await directApiRequest(page, '/rest/v1/rpc/create_report', {
      method: 'POST',
      body: { p_target_type: 'not_a_real_type', p_target_id: reviewId, p_reason: 'spam', p_description: null },
    })
    expect(badType.status).toBeGreaterThanOrEqual(400)

    const badTarget = await directApiRequest(page, '/rest/v1/rpc/create_report', {
      method: 'POST',
      body: { p_target_type: 'review', p_target_id: '00000000-0000-0000-0000-000000000000', p_reason: 'spam', p_description: null },
    })
    expect(badTarget.status).toBeGreaterThanOrEqual(400)

    const badReason = await directApiRequest(page, '/rest/v1/rpc/create_report', {
      method: 'POST',
      body: { p_target_type: 'review', p_target_id: reviewId, p_reason: 'not_a_real_reason', p_description: null },
    })
    expect(badReason.status).toBeGreaterThanOrEqual(400)
  })
})
