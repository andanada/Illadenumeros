import { defineConfig, devices } from '@playwright/test'

const PORT = 5181
const BASE_URL = `http://127.0.0.1:${PORT}`

/** Production-build checks (service worker, offline, update). Opt-in: `npm run e2e:pwa` builds first and sets PWA_E2E. */
const PWA = !!process.env.PWA_E2E
const PWA_PORT = 4173
const SUBPATH_PORT = 4174
const DEV_ONLY = /pwa.spec.ts$/

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'ca-ES',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: PWA
    ? [
        {
          name: 'pwa',
          testMatch: DEV_ONLY,
          use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 }, baseURL: `http://127.0.0.1:${PWA_PORT}` },
        },
      ]
    : [
    {
      name: 'desktop-chrome',
      testIgnore: DEV_ONLY,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 } },
    },
    {
      name: 'ipad-landscape',
      testIgnore: DEV_ONLY,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'phone-portrait',
      testIgnore: DEV_ONLY,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: PWA
    ? [
        {
          command: `npx vite preview --port ${PWA_PORT} --host 127.0.0.1 --strictPort`,
          url: `http://127.0.0.1:${PWA_PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
        {
          command: `node scripts/static-server.mjs --dir dist --port ${SUBPATH_PORT} --prefix /mates/`,
          url: `http://127.0.0.1:${SUBPATH_PORT}/mates/`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ]
    : {
        command: `npx vite --port ${PORT} --host 127.0.0.1 --strictPort`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
