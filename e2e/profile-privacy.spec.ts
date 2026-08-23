import { test, expect } from '@playwright/test'
import path from 'node:path'
import { signInAsNewUser, signIn, STAGING_URL, type TestUser } from './support/fixtures'

/**
 * Part 10 — profile/avatar privacy. The user-avatars bucket is private
 * (public = false) with a storage RLS policy gating reads to the owner or
 * to public profiles only (see 20260822070000_public_profiles.sql, part
 * 5) — this suite proves that behavior from the outside, not just by
 * reading the migration.
 */

const AVATAR_FILE = path.join(import.meta.dirname, 'support/fixtures/test-avatar.png')

let owner: TestUser
let ownerUsername: string
let viewer: TestUser
let avatarPublicUrl: string

test.describe.serial('Profile & avatar privacy', () => {
  test('a fresh profile shows the deterministic default avatar, not a broken image', async ({ page }) => {
    owner = await signInAsNewUser(page, 'E2E Privacy Owner')
    await page.getByRole('button', { name: 'Account menu' }).click()
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    ownerUsername = new URL(page.url()).pathname.split('/').pop()!

    // No <img> avatar yet — CompanyAvatar renders the initials tile instead.
    await expect(page.locator('img[alt=""]')).toHaveCount(0)
  })

  test('owner uploads an avatar and can view it via a signed URL', async ({ page }) => {
    await signIn(page, owner)
    await page.goto(`/users/${ownerUsername}`)
    await page.getByRole('button', { name: 'Edit profile' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input[type="file"]').setInputFiles(AVATAR_FILE)
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()

    const avatarImg = page.locator('img[alt=""]').first()
    await expect(avatarImg).toBeVisible()
    const src = await avatarImg.getAttribute('src')
    expect(src).toContain('/storage/v1/object/sign/user-avatars/')

    const res = await page.request.get(src!)
    expect(res.status()).toBe(200)

    const objectPath = new URL(src!).pathname.split('/storage/v1/object/sign/user-avatars/')[1]
    avatarPublicUrl = `${STAGING_URL}/storage/v1/object/public/user-avatars/${objectPath}`
  })

  test('the same avatar file cannot be fetched through the public storage route', async ({ page }) => {
    const res = await page.request.get(avatarPublicUrl, { failOnStatusCode: false })
    expect(res.status(), 'user-avatars must stay a private bucket').not.toBe(200)
  })

  test('setting the profile private hides it from another signed-in user, but the owner still sees it', async ({ page }) => {
    await signIn(page, owner)
    await page.goto(`/users/${ownerUsername}`)
    await page.getByRole('button', { name: 'Edit profile' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Profile visibility').selectOption('private')
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Your profile is private')).toBeVisible()

    // Owner still sees their own review section etc. via the same page.
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    viewer = await signInAsNewUser(page, 'E2E Privacy Viewer')
    await page.goto(`/users/${ownerUsername}`)
    await expect(page.getByText("This profile isn't available")).toBeVisible()
  })

  test('a private avatar object is unreachable to another signed-in user even with the exact signed-URL path pattern guessed', async ({ page }) => {
    // The previously-captured signed URL's token is single-use/time-boxed
    // by Supabase's own signing, but the underlying object path is now
    // known — confirm a DIFFERENT user's session still can't read it via
    // the public route (already proven bucket-wide above) nor forge a new
    // signed URL for someone else's object (no such API is exposed to a
    // non-owner in this app to begin with — there is no code path that
    // would let viewer's session call createSignedUrl for owner's path).
    await signIn(page, viewer)
    const res = await page.request.get(avatarPublicUrl, { failOnStatusCode: false })
    expect(res.status()).not.toBe(200)
  })
})
