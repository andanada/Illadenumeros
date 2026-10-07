import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStaticServer } from '../scripts/static-server.mjs'
import { CHILD, completeDiagnostic, createProfile, expect, test } from './helpers'

// Runs only in the `pwa` Playwright project (`npm run e2e:pwa`): production build served by
// `vite preview` (root of the domain, :4173) and by a plain static server under /mates/ (:4174).

const SUBPATH_URL = 'http://127.0.0.1:4174/mates/'

/** Waits until the service worker is active, controls the page, and has precached the app. */
async function waitForOfflineReady(page: import('@playwright/test').Page): Promise<number> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))
    }
  })
  await expect
    .poll(() => page.evaluate(async () => (await (await caches.keys().then((k) => caches.open(k[0] ?? ''))).keys()).length), { timeout: 20_000 })
    .toBeGreaterThan(30)
  return page.evaluate(async () => (await (await caches.keys().then((k) => caches.open(k[0] ?? ''))).keys()).length)
}

test.describe('PWA en producció', () => {
  test('el manifest és vàlid i totes les icones existeixen', async ({ page, request, baseURL }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()
    const manifestUrl = new URL(href ?? '', page.url()).toString()
    const manifest = await (await request.get(manifestUrl)).json()
    expect(manifest).toMatchObject({ lang: 'ca', display: 'standalone', start_url: './', scope: './', id: './' })
    expect(manifest.categories).toEqual(expect.arrayContaining(['education', 'kids']))
    const purposes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose}`)
    expect(purposes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']))
    for (const icon of manifest.icons as { src: string; type: string }[]) {
      const res = await request.get(new URL(icon.src, manifestUrl).toString())
      expect(res.status(), icon.src).toBe(200)
      expect(res.headers()['content-type']).toContain(icon.type)
    }
    for (const link of ['link[rel="apple-touch-icon"]', 'link[rel="icon"][type="image/png"]']) {
      const iconHref = await page.locator(link).getAttribute('href')
      const res = await request.get(new URL(iconHref ?? '', baseURL).toString())
      expect(res.status(), link).toBe(200)
    }
  })

  test('el service worker precacheja l’app i funciona sense xarxa (arrel del domini)', async ({ page, context }) => {
    await createProfile(page)
    await completeDiagnostic(page)
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    const precached = await waitForOfflineReady(page)
    expect(precached).toBeGreaterThan(30)

    await context.setOffline(true)
    try {
      await page.reload()
      await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
      await page.getByRole('button', { name: /Missió d’avui/ }).click()
      await expect(page.getByRole('list', { name: /^Missió: 0 de 4 fets$/ })).toBeVisible()
      // A fresh navigation to a deep hash route (lazy chunk) also works offline.
      await page.goto('/#/album')
      await expect(page.locator('main')).toBeVisible()
    } finally {
      await context.setOffline(false)
    }
  })

  test('funciona des d’un subcamí (/mates/) i sense xarxa', async ({ page, context }) => {
    await page.goto(`${SUBPATH_URL}#/start`)
    await expect(page.getByRole('button', { name: 'Toca per començar' })).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/mates/')
    await waitForOfflineReady(page)
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope)
    expect(scope).toBe(SUBPATH_URL)

    await context.setOffline(true)
    try {
      await page.reload()
      await expect(page.getByRole('button', { name: 'Toca per començar' })).toBeVisible()
      await page.getByRole('button', { name: 'Toca per començar' }).click()
      await expect(page).toHaveURL(/#\/onboarding$/)
      await expect(page.getByLabel('Com et dius?')).toBeVisible()
    } finally {
      await context.setOffline(false)
    }
  })

  test('una nova versió desplegada mostra l’avís d’actualització i l’aplica', async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), 'mates-update-'))
    cpSync('dist', dir, { recursive: true })
    const server = createStaticServer({ dir })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
    try {
      await page.goto(`${url}#/start`)
      await expect(page).toHaveTitle('Mates Màgiques')
      await waitForOfflineReady(page)
      await expect(page.getByText('Hi ha coses noves!')).toBeHidden()

      // "Deploy" v2: new index.html + new precache revision for it + a changed service worker.
      const indexPath = join(dir, 'index.html')
      writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replace('<title>Mates Màgiques</title>', '<title>Mates Màgiques v2</title>'))
      const swPath = join(dir, 'sw.js')
      const sw = readFileSync(swPath, 'utf8').replace(/(url:"index\.html",revision:")[^"]*"/, '$1v2-revision"')
      expect(sw).toContain('v2-revision')
      writeFileSync(swPath, `${sw}\n/* v2 */`)

      await page.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration())?.update()
      })
      const prompt = page.getByRole('status').filter({ hasText: 'Hi ha coses noves!' })
      await expect(prompt).toBeVisible()
      // The running page is still v1 until the user accepts: the game is never interrupted.
      await expect(page).toHaveTitle('Mates Màgiques')

      await prompt.getByRole('button', { name: 'Més tard' }).click()
      await expect(prompt).toBeHidden()

      await page.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration())?.update()
      })
      // Dismissed prompts do not nag again within the same page load; reload brings the waiting worker back.
      await page.reload()
      await expect(prompt).toBeVisible({ timeout: 15_000 })
      await prompt.getByRole('button', { name: 'Actualitzar' }).click()
      await expect(page).toHaveTitle('Mates Màgiques v2', { timeout: 15_000 })
    } finally {
      server.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
