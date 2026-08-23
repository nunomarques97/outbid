import { test, expect } from '@playwright/test'
import path from 'node:path'
import { signUpNewUser, signIn, signOut, type TestUser } from './support/fixtures'

/**
 * Part 4 — authenticated customer/profile journey, all against one fresh
 * throwaway staging account created for this test file. Sequential
 * (playwright.config.ts runs with workers: 1, and this describe block is
 * .serial) so later tests can rely on state the earlier ones left behind
 * — e.g. the review created in "write a review" is what "edit"/"delete"
 * operate on.
 */

const AVATAR_FILE = path.join(import.meta.dirname, 'support/fixtures/test-avatar.png')
// A static review title would collide with any leftover review from a run
// that failed before reaching the delete step — a unique one per run keeps
// text-based assertions honest regardless of prior runs' debris.
const REVIEW_TITLE = `Great E2E experience ${Date.now()}`
let user: TestUser

test.describe.serial('Authenticated customer journey', () => {
  test('sign up creates a working session', async ({ page }) => {
    await page.goto('/')
    user = await signUpNewUser(page)
  })

  test('edit display name, bio, avatar, and interests', async ({ page }) => {
    await page.goto('/')
    await signIn(page, user)
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Edit profile' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.locator('input[type="file"]').setInputFiles(AVATAR_FILE)
    await dialog.getByLabel('Display name').fill('E2E Edited Name')
    await dialog.getByLabel('About').fill('An E2E test bio.')
    // Interests: pick the first available category chip.
    await dialog.getByRole('button', { name: /Technology|Finance|Business|Food|Travel/ }).first().click()

    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('heading', { name: 'E2E Edited Name' })).toBeVisible()
    await expect(page.getByText('An E2E test bio.')).toBeVisible()
  })

  test('profile edits persist after reload', async ({ page }) => {
    await page.goto('/')
    await signIn(page, user)
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'E2E Edited Name' })).toBeVisible()
    await expect(page.getByText('An E2E test bio.')).toBeVisible()
  })

  test('write a review, confirm it appears, then edit it', async ({ page }) => {
    await page.goto('/')
    await signIn(page, user)
    await page.goto('/companies/flowstack')

    await page.getByRole('button', { name: 'Write a review' }).click()
    await page.getByRole('button', { name: 'Rate 4 out of 5 stars' }).click()
    await page.getByLabel('Title').fill(REVIEW_TITLE)
    await page.getByLabel('Review', { exact: true }).fill('Posted by the Phase 37 automated E2E suite.')
    await page.getByRole('button', { name: 'Post review' }).click()

    await expect(page.getByText(REVIEW_TITLE)).toBeVisible()
    await expect(page.getByText('Your review')).toBeVisible()

    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Title').fill(`${REVIEW_TITLE} (edited)`)
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText(`${REVIEW_TITLE} (edited)`)).toBeVisible()
  })

  test('vote on a company and confirm it persists after reload', async ({ page }) => {
    await page.goto('/')
    await signIn(page, user)
    await page.goto('/companies/flowstack')

    const voteButton = page.getByRole('button', { name: 'Upvote company' }).first()
    await expect(voteButton).toHaveAttribute('aria-pressed', 'false')
    await voteButton.click()
    await expect(page.getByRole('button', { name: 'Remove upvote' })).toHaveAttribute('aria-pressed', 'true')

    await page.reload()
    await expect(page.getByRole('button', { name: 'Remove upvote' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('save a company and confirm it persists after reload', async ({ page }) => {
    await page.goto('/')
    await signIn(page, user)
    await page.goto('/companies/taskwave')

    // Saving is optimistic (see useSavedCompanies.ts) — the button flips
    // instantly from client cache, before the real write finishes. Wait
    // for the actual saved_companies insert to complete before reloading,
    // or the reload can race it and land before the row actually exists.
    const saveButton = page.getByRole('button', { name: 'Save company' }).first()
    const savedWritten = page.waitForResponse((res) => res.url().includes('/rest/v1/saved_companies') && res.request().method() === 'POST')
    await saveButton.click()
    await expect(page.getByRole('button', { name: 'Remove from saved' })).toHaveAttribute('aria-pressed', 'true')
    await savedWritten

    await page.reload()
    await expect(page.getByRole('button', { name: 'Remove from saved' })).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/saved')
    await expect(page.getByText('Taskwave')).toBeVisible()
  })

  test('watch a deal and confirm it persists after reload', async ({ page }) => {
    await page.goto('/')
    await signIn(page, user)
    await page.goto('/companies/ember-oak-coffee')

    // Watching is optimistic too (useWatchedDeals.ts) — same reasoning as
    // the save-a-company case above: wait for the real write before reload.
    const watchButton = page.getByRole('button', { name: 'Watch deal' })
    await expect(watchButton).toBeVisible()
    const watchWritten = page.waitForResponse((res) => res.url().includes('/rest/v1/deal_claims') && res.request().method() === 'POST')
    await watchButton.click()
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible()
    await watchWritten

    await page.reload()
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible()
  })

  test('delete the review created earlier', async ({ page }) => {
    await page.goto('/')
    await signIn(page, user)
    await page.goto('/companies/flowstack')
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByText(`${REVIEW_TITLE} (edited)`)).toHaveCount(0)
  })

  test('sign out then sign back in and confirm state remained correct', async ({ page }) => {
    await page.goto('/')
    await signIn(page, user)
    await signOut(page)
    await signIn(page, user)

    await page.goto('/companies/flowstack')
    await expect(page.getByRole('button', { name: 'Remove upvote' })).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/saved')
    await expect(page.getByText('Taskwave')).toBeVisible()
  })
})
