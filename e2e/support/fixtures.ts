import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Phase 37 E2E test-data helpers.
 *
 * All test accounts are throwaway: a unique email is generated per test
 * run so no real/shared credentials ever need to live in source control,
 * and repeated runs never collide with each other's data. Passwords are
 * generated per-account too — nothing here is a secret worth protecting,
 * it only ever unlocks a disposable staging test account.
 */

const RUN_ID = `${Date.now()}${Math.floor(Math.random() * 1000)}`
let counter = 0

/**
 * example.com is IANA-reserved for documentation/testing (RFC 2606) and
 * never delivers real mail — used here instead of a made-up TLD because
 * Supabase Auth's signup endpoint rejects addresses under unrecognized
 * TLDs outright (confirmed live: a `.test` address was rejected with
 * `email_address_invalid` before ever reaching the mailer).
 */
export function uniqueEmail(prefix: string): string {
  counter += 1
  return `e2e-${prefix}-${RUN_ID}-${counter}@example.com`
}

export function uniquePassword(): string {
  return `E2e!${RUN_ID}${counter}Test`
}

export function uniqueName(prefix: string): string {
  counter += 1
  return `${prefix} ${RUN_ID}${counter}`
}

export interface TestUser {
  email: string
  password: string
  displayName: string
}

/** The header's own "Sign in" trigger, scoped away from the dialog's identically-labeled tab/submit button once it opens. */
export function headerSignInButton(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: 'Sign in' })
}

/** Opens the header sign-in dialog, switches to Sign up, and creates a fresh account. Email confirmation is disabled on staging, so this leaves the browser signed in. */
export async function signUpNewUser(page: Page, displayName?: string): Promise<TestUser> {
  const user: TestUser = {
    email: uniqueEmail('user'),
    password: uniquePassword(),
    displayName: displayName ?? uniqueName('E2E User'),
  }

  await headerSignInButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('tab', { name: 'Sign up' }).click()
  await dialog.getByPlaceholder('Display name').fill(user.displayName)
  await dialog.getByPlaceholder('Email').fill(user.email)
  await dialog.getByPlaceholder('Password').fill(user.password)
  await dialog.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible({ timeout: 10_000 })

  return user
}

/**
 * Creates a real, working staging account directly via SQL (bcrypt-hashed
 * password through pgcrypto, a matching auth.identities row, both mirroring
 * exactly what GoTrue itself would write) instead of the public
 * /auth/v1/signup endpoint.
 *
 * Why: OUTBID-STAGING uses Supabase's shared/default email sending
 * service (no custom SMTP configured), which enforces a low hourly send
 * quota — confirmed live by hitting `over_email_send_rate_limit` on the
 * SECOND signup attempt of this whole test run, even with email
 * confirmations disabled (enable_confirmations = false doesn't skip
 * GoTrue's rate-limit check, only the confirmation email content itself).
 * A suite that provisions 20-30 throwaway accounts cannot go through that
 * endpoint. This path is exercised by exactly one test (the real signup
 * flow, in customer-account.spec.ts) — every other test that just needs
 * *a* signed-in account uses this instead, then signs in through the real
 * UI (see signInAsNewUser below), which is unrelated to the mailer and
 * not rate-limited.
 *
 * Confirmed equivalent to a real signup before relying on this: the
 * resulting row signs in successfully via the real password-grant
 * endpoint, and public.profiles is populated by the same handle_new_user()
 * trigger a UI signup fires (verified live against a throwaway row,
 * cleaned up immediately after).
 */
export function provisionTestUser(displayName?: string): TestUser {
  const user: TestUser = {
    email: uniqueEmail('user'),
    password: uniquePassword(),
    displayName: displayName ?? uniqueName('E2E User'),
  }
  dbQuery(`
    with new_user as (
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated', 'authenticated',
        '${escapeSql(user.email)}',
        crypt('${escapeSql(user.password)}', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('display_name', '${escapeSql(user.displayName)}'),
        now(), now(), '', '', '', ''
      )
      returning id, email
    )
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
    select gen_random_uuid(), new_user.id::text, new_user.id,
      jsonb_build_object('sub', new_user.id::text, 'email', new_user.email),
      'email', now(), now(), now()
    from new_user;
  `)
  return user
}

/** provisionTestUser() + a real sign-in through the UI — the shortcut most tests want when they just need to start already signed in as a fresh account. */
export async function signInAsNewUser(page: Page, displayName?: string): Promise<TestUser> {
  const user = provisionTestUser(displayName)
  await page.goto('/')
  await signIn(page, user)
  return user
}

/**
 * Navigates to the homepage first (every Playwright test starts on a blank
 * page, and the header this needs only exists on a real app route), signs
 * out first if some other account is currently signed in (the header's
 * "Sign in" trigger only exists while signed out — several tests in this
 * suite switch between two accounts within one test), then signs in
 * through the real UI.
 */
export async function signIn(page: Page, user: Pick<TestUser, 'email' | 'password'>): Promise<void> {
  if (page.url() === 'about:blank') await page.goto('/')
  if (await page.getByRole('button', { name: 'Account menu' }).isVisible()) await signOut(page)
  await headerSignInButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Email').fill(user.email)
  await dialog.getByPlaceholder('Password').fill(user.password)
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible({ timeout: 10_000 })
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  // Scoped to the header: a page full of signed-out deal cards also shows
  // several "Sign in to watch" buttons, which the unscoped locator matches too.
  await expect(headerSignInButton(page)).toBeVisible()
}

/**
 * Direct SQL against OUTBID-STAGING via the linked Supabase CLI (Management
 * API connection — bypasses RLS/grants). Used ONLY for authoritative
 * verification (confirming a row exists/doesn't, confirming a constraint
 * held) or to simulate the Stripe webhook's activation step (which cannot
 * be triggered from the browser without a live Stripe secret key) — never
 * to replace an actual browser action a user could take.
 */
export function dbQuery<T = Record<string, unknown>>(sql: string): T[] {
  const dir = mkdtempSync(path.join(tmpdir(), 'repcastr-e2e-'))
  const file = path.join(dir, 'query.sql')
  writeFileSync(file, sql, 'utf-8')
  try {
    const out = execFileSync(
      'npx',
      ['supabase', 'db', 'query', '--linked', '--output', 'json', '--file', file],
      { encoding: 'utf-8', cwd: process.cwd(), shell: true },
    )
    const parsed = JSON.parse(out) as { rows: T[] }
    return parsed.rows
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Looks up a test user's auth.users id by email, for cleanup/verification queries. */
export function findUserIdByEmail(email: string): string | null {
  const rows = dbQuery<{ id: string }>(`select id from auth.users where email = '${escapeSql(email)}';`)
  return rows[0]?.id ?? null
}

export function escapeSql(value: string): string {
  return value.replace(/'/g, "''")
}

/**
 * Deletes a test company created by this suite (cascades bids, categories,
 * deals, reviews, etc. — every FK to companies is ON DELETE CASCADE).
 * Wrapped with the min-1-category floor trigger disabled for the
 * transaction: that deferred constraint checks a deleted company's
 * cascaded-away category rows at commit with no exemption for "the company
 * itself is also gone", so a plain `delete from companies` always trips it
 * — confirmed live. There is no product-facing "delete a company" feature
 * this would ever affect; it only matters for cleaning up test data like this.
 */
export function deleteTestCompanyBySlug(slug: string): void {
  const rows = dbQuery<{ id: string }>(`select id from companies where slug = '${escapeSql(slug)}';`)
  if (rows[0]) deleteTestCompany(rows[0].id)
}

export function deleteTestCompany(companyId: string): void {
  dbQuery(`
    begin;
    alter table company_categories disable trigger company_categories_enforce_min;
    delete from companies where id = '${companyId}';
    alter table company_categories enable trigger company_categories_enforce_min;
    commit;
  `)
}

export const STAGING_URL = 'https://vjceycspucjkvvisnzwy.supabase.co'
export const STAGING_ANON_KEY = 'sb_publishable_cpWBGchQT6jdCyEWxBT_sQ_VnVPz_yF'

/**
 * Reads the signed-in user's own access token straight out of localStorage
 * (where supabase-js persists it) so a test can make a REAL authenticated
 * REST/RPC call that bypasses this app's own client code entirely — used
 * only to prove RLS/DB constraints hold even against a direct API call an
 * attacker could make, never to replace a real UI action.
 */
export async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) return (JSON.parse(raw) as { access_token: string }).access_token
      }
    }
    return null
  })
  if (!token) throw new Error('No Supabase session found in localStorage — is the caller signed in?')
  return token
}

/**
 * A direct, authenticated PostgREST/RPC call — see getAccessToken above for
 * why this exists. This is the ONLY valid way this suite has to test RLS
 * enforcement: it goes through the real `authenticated` PostgREST role
 * under the caller's real JWT, unlike dbQuery, which connects as `postgres`
 * with rolbypassrls = true (confirmed live) and so silently ignores RLS
 * regardless of any `set request.jwt.claim.sub` override — that trick only
 * changes what auth.uid() evaluates to inside a function/trigger, it does
 * not re-engage row security for a bypassrls connection.
 */
export async function directApiRequest(
  page: Page,
  path: string,
  init: { method: 'GET' | 'POST' | 'PATCH'; body?: unknown },
): Promise<{ status: number; body: unknown }> {
  const accessToken = await getAccessToken(page)
  return page.evaluate(
    async ({ url, anonKey, accessToken, init }) => {
      const res = await fetch(url, {
        method: init.method,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: init.method === 'GET' ? undefined : JSON.stringify(init.body),
      })
      const text = await res.text()
      let body: unknown
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
      return { status: res.status, body }
    },
    { url: `${STAGING_URL}${path}`, anonKey: STAGING_ANON_KEY, accessToken, init },
  )
}
