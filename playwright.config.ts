import { defineConfig, devices } from '@playwright/test'

/**
 * Phase 37 E2E suite. Runs against a locally-served build of the app that
 * is itself wired to OUTBID-STAGING via .env.local (VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY) — this is a real browser driving the real app
 * against the real staging database, not a mocked build. Empty-state specs
 * are the one deliberate exception: they use route interception to
 * simulate zero content without touching staging data (see e2e/empty-state.spec.ts).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
