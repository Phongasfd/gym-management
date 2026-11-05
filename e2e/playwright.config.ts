import { defineConfig, devices } from '@playwright/test';
import { E2E } from './support/env';

// Starts the real backend and the real member portal against a throwaway database
// (E2E_DATABASE_URL, migrated and seeded by global-setup.ts) and drives them with a browser.
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // the tests share one database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: E2E.webUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Locally you can use an installed browser instead of downloading one: PW_CHANNEL=chrome or msedge
    ...devices['Desktop Chrome'],
    channel: process.env.PW_CHANNEL || undefined,
  },
  webServer: [
    {
      name: 'api',
      command: 'npx tsx src/server.ts',
      cwd: '../backend',
      url: `${E2E.apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: E2E.backendEnv,
    },
    {
      name: 'portal',
      // Next inlines NEXT_PUBLIC_* at build time, so the portal is built for the e2e API URL.
      command: `npm run build && npx next start -p ${E2E.webPort}`,
      cwd: '../frontend-user-next',
      url: E2E.webUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { NEXT_PUBLIC_API_BASE_URL: `${E2E.apiUrl}/api` },
    },
  ],
});
