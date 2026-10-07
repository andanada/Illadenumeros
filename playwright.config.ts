import { defineConfig, devices } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SYNC_INVITE_CODE } from './e2e/syncEnv'

const PORT = 5181
const BASE_URL = `http://127.0.0.1:${PORT}`

/** Production-build checks (service worker, offline, update). Opt-in: `npm run e2e:pwa` builds first and sets PWA_E2E. */
const PWA = !!process.env.PWA_E2E
const PWA_PORT = 4173
const SUBPATH_PORT = 4174
const DEV_ONLY = /pwa.spec.ts$/

/**
 * Accounts + cloud sync against the REAL API (server/). Opt-in: `npm run e2e:sync` builds the server and
 * sets SYNC_E2E. Uses `localhost` (not 127.0.0.1): Chrome treats it as a secure context, so the
 * `__Host-` Secure session cookie works over plain http.
 */
const SYNC = !!process.env.SYNC_E2E
const SYNC_PORT = 5182
const SYNC_API_PORT = Number(process.env.SYNC_API_PORT ?? 3100)
const SYNC_DB = join(tmpdir(), `mates-e2e-${process.pid}-${Date.now()}`, 'mates.db')
const SYNC_API_ENV = {
  NODE_ENV: 'production',
  HOST: '127.0.0.1',
  PORT: String(SYNC_API_PORT),
  DATABASE_PATH: SYNC_DB,
  IP_HASH_SALT: 'e2e0'.repeat(16),
  REGISTRATION_CODE: SYNC_INVITE_CODE,
  SESSION_COOKIE_SECURE: 'true',
  TRUST_PROXY: '127.0.0.1',
  LOG_LEVEL: 'warn',
  ARGON2_MEMORY_KIB: '8192',
  ARGON2_TIME_COST: '1',
  RATE_LIMIT_GLOBAL: '10000',
  RATE_LIMIT_AUTH: '1000',
  RATE_LIMIT_LOGIN: '1000',
  RATE_LIMIT_SYNC: '10000',
  RATE_LIMIT_PROFILE: '1000',
  LOGIN_MAX_FAILURES: '100',
  LOGIN_EMAIL_MAX_FAILURES: '10000',
}
const NOT_DEFAULT = /(pwa|sync).spec.ts$/

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
  projects: SYNC
    ? [
        {
          name: 'sync',
          testMatch: /sync.spec.ts$/,
          use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 }, baseURL: `http://localhost:${SYNC_PORT}` },
        },
      ]
    : PWA
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
      testIgnore: NOT_DEFAULT,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 } },
    },
    {
      name: 'ipad-landscape',
      testIgnore: NOT_DEFAULT,
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
      testIgnore: NOT_DEFAULT,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: SYNC
    ? [
        {
          command: 'node server/dist/server.js',
          url: `http://127.0.0.1:${SYNC_API_PORT}/api/health`,
          env: SYNC_API_ENV,
          reuseExistingServer: false,
          timeout: 60_000,
        },
        {
          command: `npx vite --port ${SYNC_PORT} --host localhost --strictPort`,
          url: `http://localhost:${SYNC_PORT}`,
          env: { MATES_API_URL: `http://127.0.0.1:${SYNC_API_PORT}` },
          reuseExistingServer: false,
          timeout: 120_000,
        },
      ]
    : PWA
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
