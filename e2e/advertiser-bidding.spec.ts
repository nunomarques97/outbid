import { test, expect, type Page } from '@playwright/test'
import { signInAsNewUser, signIn, dbQuery, escapeSql, deleteTestCompany, type TestUser } from './support/fixtures'

/**
 * Parts 7 & 8 — sponsored bidding in Stripe TEST MODE, and cross-company
 * outbid/ranking behavior.
 *
 * Scope note (documented up front, not discovered after the fact): this
 * suite drives the REAL "Start bidding"/"Adjust your bid" UI and the REAL
 * create-bid-payment Edge Function for every case, and verifies the exact
 * charge/target amounts it computes via direct DB read. It deliberately
 * does NOT complete Stripe's own hosted Checkout page — there is no way to
 * confirm a real (even test-mode) PaymentIntent from this harness without
 * the Stripe secret key, which lives only in Edge Function secrets and is
 * never exposed to the browser or this test suite. Per this phase's own
 * Part 7 instruction, the activation step that Stripe's webhook would
 * normally trigger is instead simulated with a direct call to
 * activate_bid_payment() — the exact function the webhook itself calls —
 * against OUTBID-STAGING, which is the authoritative-verification path
 * this phase explicitly allows. Navigation to checkout.stripe.com is
 * blocked at the network level so the run never leaves the app or depends
 * on Stripe's UI being reachable/stable.
 *
 * The product's bid slider moves in fixed €10 steps (see Slider step={10}
 * in StartBidCard/BidAdjustControl) — driving the real UI keyboard-steps
 * the thumb rather than injecting an arbitrary value, so amounts used here
 * are multiples of €10 (e.g. €20→€30, not the brief's illustrative
 * €20→€25) as the closest equivalent achievable through actual user
 * interaction with the real control.
 */

async function focusBidSlider(page: Page) {
  const slider = page.getByRole('slider', { name: 'Bid amount' })
  await slider.click()
  return slider
}

async function setSliderToMultipleOfTen(page: Page, amount: number) {
  const slider = await focusBidSlider(page)
  await slider.press('Home')
  for (let i = 0; i < amount / 10; i++) {
    await slider.press('ArrowRight')
  }
}

async function blockStripeNavigation(page: Page) {
  await page.route('**://checkout.stripe.com/**', (route) => route.abort())
}

/**
 * page.goto, tolerant of the one specific transient race this suite
 * creates on purpose: after a successful bid submission the app does
 * `window.location.href = checkoutUrl`, which blockStripeNavigation aborts
 * — but the browser can still be mid-way through committing that failed
 * navigation to an error document when the very next line tries to
 * navigate again, which Playwright surfaces as "interrupted by another
 * navigation". A single retry is correct here specifically because the
 * only in-flight navigation this suite ever has is that known, already-
 * failing one — never a second real navigation this would incorrectly
 * paper over.
 */
async function safeGoto(page: Page, path: string) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await page.goto(path)
      return
    } catch (err) {
      const interrupted = err instanceof Error && err.message.includes('interrupted by another navigation')
      if (!interrupted || attempt === 4) throw err
      await page.waitForTimeout(250 * attempt)
    }
  }
}

/**
 * Clicks the bid submit button and captures create-bid-payment's response
 * (checkoutUrl + implied amounts verified separately via DB).
 *
 * Routed through page.route rather than a plain waitForResponse: on
 * success the app immediately does `window.location.href = checkoutUrl`,
 * which starts tearing down the current document — a `response.json()`
 * read that happens even one microtask too late race-loses against that
 * navigation and fails with "No resource with given identifier found".
 * Intercepting the request lets this read the real body (via route.fetch)
 * BEFORE handing the exact same response back to the page, so there's no
 * race no matter how fast the app reacts to it.
 */
async function submitBidExpectingCheckout(page: Page, buttonName: string) {
  let captured: { checkoutUrl?: string; error?: string } | undefined
  await page.route('**/functions/v1/create-bid-payment', async (route) => {
    const response = await route.fetch()
    captured = (await response.json()) as { checkoutUrl?: string; error?: string }
    await route.fulfill({ response })
  })
  // On success the app immediately sets window.location.href to the
  // (blocked) Stripe URL — wait for that attempted top-level navigation to
  // actually finish failing before this returns, so a caller's next
  // page.goto() doesn't race an in-flight aborted navigation and get
  // "interrupted by another navigation to chrome-error://chromewebdata/".
  const stripeRequestFailed = page
    .waitForEvent('requestfailed', { predicate: (req) => req.url().includes('checkout.stripe.com'), timeout: 5_000 })
    .catch(() => {})
  await page.getByRole('button', { name: buttonName }).click()
  await page.waitForResponse((res) => res.url().includes('/functions/v1/create-bid-payment'))
  await page.unroute('**/functions/v1/create-bid-payment')
  await stripeRequestFailed
  if (!captured) throw new Error('create-bid-payment response was never captured')
  return captured
}

/**
 * OUTBID-STAGING already carries real, higher pre-existing bids (seen live:
 * up to €910) — so a modest test bid never reaches actual global rank #1,
 * meaning the dashboard's "Leading"/"Outbid" badge (which reflects only
 * "am I the single global #1 bid", see isCompanyOutbid in ranking.ts) is
 * never a meaningful signal for these two test companies specifically.
 * What Part 8 actually needs proven — that raising a bid moves a company
 * ahead of a specific competitor, and that the ranking used for this is
 * the real one — is checked here via each company's actual rank among all
 * active bids, authoritatively, rather than by that global-only badge.
 */
function getBidRank(companyId: string): number {
  const rows = dbQuery<{ rank: string }>(`
    select rank::text from (
      select company_id, rank() over (order by amount desc, created_at asc) as rank
      from bids where status = 'active'
    ) ranked where company_id = '${companyId}';
  `)
  expect(rows.length, `expected an active bid for company ${companyId}`).toBe(1)
  return Number(rows[0].rank)
}

function activatePendingPayment(companyId: string): { amount: number; target_bid_amount: number } {
  const pending = dbQuery<{ id: string; amount: string; target_bid_amount: string }>(
    `select id, amount, target_bid_amount from bid_payments where company_id = '${companyId}' and status = 'pending' order by created_at desc limit 1;`,
  )
  expect(pending.length, 'expected a pending bid_payments row').toBe(1)
  dbQuery(`select activate_bid_payment('${pending[0].id}');`)
  return { amount: Number(pending[0].amount), target_bid_amount: Number(pending[0].target_bid_amount) }
}

async function createAdvertiserWithCompany(page: Page, categoryNames: string[]): Promise<{ user: TestUser; companyId: string; slug: string }> {
  const user = await signInAsNewUser(page, 'E2E Bidder')
  const slugSeed = `e2e-bid-co-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  await page.goto('/dashboard/new')
  await page.getByPlaceholder('e.g. Flowstack').fill(slugSeed)
  await page.getByPlaceholder('One line describing what you do').fill('An E2E bidding test company')
  await page
    .getByPlaceholder('What does your company do, and who is it for?')
    .fill('Created by the Phase 37 automated E2E suite to test sponsored bidding end to end.')
  await page.getByPlaceholder('example.com').fill('example.com')
  for (const name of categoryNames) {
    await page.getByRole('button', { name }).click()
  }
  await page.getByRole('button', { name: 'Create company' }).click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 })

  const rows = dbQuery<{ id: string; slug: string }>(
    `select id, slug from companies where slug ilike '${escapeSql(slugSeed)}%' order by created_at desc limit 1;`,
  )
  expect(rows.length).toBe(1)
  return { user, companyId: rows[0].id, slug: rows[0].slug }
}

test.describe.serial('Sponsored bidding: Stripe test-mode amount matrix + outbid ranking', () => {
  let companyAId: string
  let companyASlug: string
  let userA: TestUser
  let companyBId: string

  // Both test companies place real, non-trivial bids — left in place across
  // runs, these accumulate in whichever category they picked and can push
  // a later run's own modest test bid out of a category page's top-3
  // sponsored slots (confirmed live: this happened after several repeated
  // runs during development). Cleaning them up keeps every run's ranking
  // assertions meaningful regardless of how many times this file has run before.
  test.afterAll(() => {
    if (companyAId) deleteTestCompany(companyAId)
    if (companyBId) deleteTestCompany(companyBId)
  })

  test('A: new bid €0 -> €10 charges exactly €10', async ({ page }) => {
    await blockStripeNavigation(page)
    const created = await createAdvertiserWithCompany(page, ['Automotive'])
    userA = created.user
    companyAId = created.companyId
    companyASlug = created.slug

    await page.goto('/dashboard?tab=bids')
    await setSliderToMultipleOfTen(page, 10)
    const result = await submitBidExpectingCheckout(page, 'Start bidding')
    expect(result.checkoutUrl, JSON.stringify(result)).toMatch(/^https:\/\/checkout\.stripe\.com\//)

    const activated = activatePendingPayment(companyAId)
    expect(activated.amount).toBe(10)
    expect(activated.target_bid_amount).toBe(10)

    await safeGoto(page, '/dashboard?tab=bids')
    await expect(page.getByText('€10').first()).toBeVisible()
  })

  test('B: raise €10 -> €20 charges exactly €10 (the delta, not the full target)', async ({ page }) => {
    await blockStripeNavigation(page)
    await signIn(page, userA)
    await page.goto('/dashboard?tab=bids')
    await setSliderToMultipleOfTen(page, 20)
    const result = await submitBidExpectingCheckout(page, /Raise bid/)
    expect(result.checkoutUrl, JSON.stringify(result)).toMatch(/^https:\/\/checkout\.stripe\.com\//)

    const activated = activatePendingPayment(companyAId)
    expect(activated.amount).toBe(10)
    expect(activated.target_bid_amount).toBe(20)
  })

  test('C: raise €20 -> €30 again charges exactly the €10 delta', async ({ page }) => {
    await blockStripeNavigation(page)
    await signIn(page, userA)
    await page.goto('/dashboard?tab=bids')
    await setSliderToMultipleOfTen(page, 30)
    await submitBidExpectingCheckout(page, /Raise bid/)
    const activated = activatePendingPayment(companyAId)
    expect(activated.amount).toBe(10)
    expect(activated.target_bid_amount).toBe(30)
  })

  test('D: same amount €30 -> €30 needs no Checkout and does not change the bid', async ({ page }) => {
    await signIn(page, userA)
    await page.goto('/dashboard?tab=bids')

    let checkoutCalled = false
    page.on('request', (req) => {
      if (req.url().includes('/functions/v1/create-bid-payment')) checkoutCalled = true
    })

    // The slider defaults to currentAmount (€30) — submit without moving it.
    await page.getByRole('button', { name: 'Keep bid' }).click()
    await expect(page.getByText(/stays at/)).toBeVisible()
    expect(checkoutCalled).toBe(false)

    const rows = dbQuery<{ amount: string }>(
      `select amount::text as amount from bids where company_id = '${companyAId}' and status = 'active';`,
    )
    expect(rows[0].amount).toBe('30.00')
  })

  test('E: lowering €30 -> €20 is rejected client-side, no Checkout, no change', async ({ page }) => {
    await signIn(page, userA)
    await page.goto('/dashboard?tab=bids')

    let checkoutCalled = false
    page.on('request', (req) => {
      if (req.url().includes('/functions/v1/create-bid-payment')) checkoutCalled = true
    })

    const slider = await focusBidSlider(page)
    await slider.press('ArrowLeft') // 30 -> 20
    await expect(page.getByText("If you want a higher position, increase your bid.")).toBeVisible()
    await expect(page.getByRole('button', { name: "Bids can't be lowered" })).toBeDisabled()
    expect(checkoutCalled).toBe(false)

    const rows = dbQuery<{ amount: string }>(
      `select amount::text as amount from bids where company_id = '${companyAId}' and status = 'active';`,
    )
    expect(rows[0].amount).toBe('30.00')
  })

  test('there is no customer-facing withdraw action', async ({ page }) => {
    await signIn(page, userA)
    await page.goto('/dashboard?tab=bids')
    await expect(page.getByRole('button', { name: /withdraw/i })).toHaveCount(0)
  })

  test('B places a higher bid and outbids A', async ({ page }) => {
    await blockStripeNavigation(page)
    const created = await createAdvertiserWithCompany(page, ['Automotive', 'Finance'])
    companyBId = created.companyId

    await page.goto('/dashboard?tab=bids')
    await setSliderToMultipleOfTen(page, 100)
    await submitBidExpectingCheckout(page, 'Start bidding')
    const activated = activatePendingPayment(companyBId)
    expect(activated.target_bid_amount).toBe(100)

    // B (€100) now ranks strictly ahead of A (€30 at this point) — the
    // real, DB-authoritative outcome of B's higher bid.
    expect(getBidRank(companyBId)).toBeLessThan(getBidRank(companyAId))
  })

  test("A sees the outbid banner; A's bid amount did not decrease", async ({ page }) => {
    await signIn(page, userA)
    await page.goto('/dashboard')
    await expect(page.getByText(/outbid on/)).toBeVisible()
    await expect(page.getByText('Outbid', { exact: true })).toBeVisible()

    const rows = dbQuery<{ amount: string }>(
      `select amount::text as amount from bids where company_id = '${companyAId}' and status = 'active';`,
    )
    expect(rows[0].amount).toBe('30.00')
  })

  test('A raises and can retake the lead over B; sponsored rank is separate from organic rank', async ({ page }) => {
    await blockStripeNavigation(page)
    await signIn(page, userA)
    await page.goto('/dashboard?tab=bids')
    await setSliderToMultipleOfTen(page, 150)
    await submitBidExpectingCheckout(page, /Raise bid/)
    activatePendingPayment(companyAId)

    // A (€150) now ranks strictly ahead of B (€100) again.
    expect(getBidRank(companyAId)).toBeLessThan(getBidRank(companyBId))

    // Sponsored placement never touches the organic (community-voted) rank
    // — the profile page shows both, independently derived.
    await safeGoto(page, `/companies/${companyASlug}`)
    await expect(page.getByText('Sponsored', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Community rank')).toBeVisible()
  })

  test("B's single bid appears consistently in Top Bidders and in both of its categories", async ({ page }) => {
    await page.goto('/top-bidders')
    await expect(page.getByText('€100').first()).toBeVisible()

    await page.goto('/categories/automotive')
    await expect(page.getByText('€100').first()).toBeVisible()
    await page.goto('/categories/finance')
    await expect(page.getByText('€100').first()).toBeVisible()

    // One row in bids for B — never a second, category-specific payment.
    const rows = dbQuery<{ count: string }>(`select count(*)::text as count from bids where company_id = '${companyBId}';`)
    expect(rows[0].count).toBe('1')
  })
})
