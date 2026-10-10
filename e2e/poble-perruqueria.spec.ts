import type { Browser, Locator, Page } from '@playwright/test'
import { CHILD, completeDiagnostic, createProfile, expect, hasHorizontalScroll, playerDbNames, test as base } from './helpers'

type StorageState = Awaited<ReturnType<Awaited<ReturnType<Browser['newContext']>>['storageState']>>

/** A profile that finished the first day, created once per worker through the UI. */
const test = base.extend<object, { townState: StorageState }>({
  townState: [
    async ({ browser }, use, workerInfo) => {
      const baseURL = workerInfo.project.use.baseURL
      if (!baseURL) throw new Error('Falta baseURL a la configuració de Playwright')
      const context = await browser.newContext({ baseURL })
      context.setDefaultTimeout(15_000)
      try {
        const page = await context.newPage()
        await createProfile(page)
        await completeDiagnostic(page)
        await expect(page.getByTestId('street')).toBeVisible()
        await use(await context.storageState({ indexedDB: true }))
      } finally {
        await context.close().catch(() => undefined)
      }
    },
    { scope: 'worker', timeout: 120_000 },
  ],
  storageState: async ({ townState }, use) => {
    await use(townState)
  },
})

/** Screenshots for the design review go here (outside the repo when POBLE_SHOTS is set). */
const SHOTS = process.env.POBLE_SHOTS

async function shot(page: Page, name: string, project: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: false })
}

const coins = async (page: Page): Promise<number> => Number(await page.getByTestId('coins').getAttribute('data-coins'))

async function centre(el: Locator): Promise<{ x: number; y: number }> {
  const box = await el.boundingBox()
  if (!box) throw new Error('Element sense caixa')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Drag with real pointer events, in small steps like a finger. */
async function dragToPoint(page: Page, from: Locator, to: { x: number; y: number }): Promise<void> {
  const a = await centre(from)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(a.x + 12, a.y + 4, { steps: 3 })
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
}

async function moveProp(page: Page, method: 'drag' | 'tap', prop: Locator, zone: Locator): Promise<void> {
  if (method === 'drag') return dragToPoint(page, prop, await centre(zone))
  await prop.click()
  await zone.click()
}

async function seedBoard(page: Page, tasks: readonly Record<string, unknown>[]): Promise<void> {
  const dbName = (await playerDbNames(page))[CHILD.name]
  if (!dbName) throw new Error('No hi ha base de dades del jugador')
  await page.evaluate(
    async ({ name, tasks: list }) => {
      const value = { day: new Date().toLocaleDateString('sv-SE'), tasks: list, done: {} }
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(name)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      const tx = database.transaction('meta', 'readwrite')
      tx.objectStore('meta').put({ key: 'errandBoard', value })
      tx.objectStore('meta').delete('dailyRequests')
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      database.close()
    },
    { name: dbName, tasks },
  )
}

async function enterSalon(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await expect(page.getByTestId('street')).toBeVisible()
  await seedBoard(page, [{ place: 'perruqueria', count: 3, kind: 'repte', neighbour: 'la-nuria' }])
  await page.reload()
  await expect(page.getByTestId('street')).toBeVisible()
  const door = page.getByRole('button', { name: /^Entra a (la )?Perruqueria$/i })
  const width = page.viewportSize()?.width ?? 1024
  for (let i = 0; i < 20; i++) {
    const box = await door.boundingBox()
    const x = box ? box.x + box.width / 2 : -1000
    if (x > 110 && x < width - 110) break
    await page.getByRole('button', { name: x < width / 2 ? 'Camina cap a l’esquerra' : 'Camina cap a la dreta' }).click()
    await page.waitForTimeout(450)
  }
  await door.click()
  await expect(page.getByRole('region', { name: 'La Perruqueria', exact: true })).toBeVisible()
}

const wish = (page: Page): Locator => page.getByRole('button', { name: /toca per atendre/ })

/** Solves the clips errand: n clips from the box to the tray. Returns false when the request cannot be read. */
async function solveClips(page: Page, method: 'drag' | 'tap'): Promise<boolean> {
  const request = (await page.getByTestId('errand-request').innerText()).replace(/\s+/g, ' ')
  const pair = /: (\d+) \+ (\d+)\./.exec(request)
  const more = /Ja porto (\d+) \S+ i en vull (\d+)/.exec(request)
  const n = pair ? Number(pair[1]) + Number(pair[2]) : more ? Number(more[2]) - Number(more[1]) : undefined
  if (n === undefined) return false
  for (let i = 0; i < n; i++) await moveProp(page, method, page.locator('[data-prop-kind="pinca-caixa"]'), page.locator('[data-zone-id="safata-pinces"]'))
  await page.getByRole('button', { name: 'Ja està!' }).click()
  return true
}

async function serveOne(page: Page, method: 'drag' | 'tap', hooks: { asking?: () => Promise<void>; thanked?: () => Promise<void> } = {}): Promise<void> {
  for (let tries = 0; tries < 25; tries++) {
    if (!(await wish(page).isVisible())) {
      await page.clock.fastForward(30_000)
      await expect(wish(page)).toBeVisible({ timeout: 15_000 })
    }
    await wish(page).click({ force: true })
    await expect(page.locator('[data-errand-kind]')).toBeVisible()
    await hooks.asking?.()
    if (await solveClips(page, method)) {
      await expect(page.getByRole('button', { name: 'Adéu!' })).toBeVisible()
      await hooks.thanked?.()
      await page.getByRole('button', { name: 'Adéu!' }).click()
      await expect(page.locator('[data-errand-kind]')).toHaveCount(0)
      return
    }
    await page.getByRole('button', { name: 'Ara no' }).click()
  }
  throw new Error(`Cap encàrrec resolt amb ${method}`)
}

const isLandscape = (page: Page): boolean => {
  const size = page.viewportSize()
  return !!size && size.width > size.height
}

test.describe('Perruqueria (sandbox)', () => {
  test('a customer asks for clips with a bubble: by drag and by tap; then the chain of tools restyles her, the mirror follows', async ({ page, consoleErrors }, testInfo) => {
    test.setTimeout(150_000)
    const project = testInfo.project.name
    await page.clock.install({ time: new Date(2026, 9, 9, 12, 0, 0) })
    await enterSalon(page)
    const room = page.getByRole('region', { name: 'El saló', exact: true })
    await expect(room.locator('[data-actor="la-nuria"]')).toBeInViewport({ ratio: 0.4 })
    await expect(wish(page)).toBeInViewport()
    await page.waitForTimeout(900)
    await shot(page, 'perruqueria-sandbox-inici', project)
    const start = await coins(page)

    await serveOne(page, 'drag', {
      asking: async () => {
        await expect(page.getByTestId('errand-request')).toBeInViewport()
        await expect(page.getByRole('button', { name: 'Ara no' })).toBeInViewport()
        await expect(page.getByRole('button', { name: 'Ja està!' })).toBeInViewport()
        await page.waitForTimeout(600)
        await shot(page, 'perruqueria-sandbox-encarrec', project)
      },
      thanked: async () => {
        await expect(page.getByTestId('errand-request')).toContainText('Moltes gràcies')
        await shot(page, 'perruqueria-sandbox-gracies', project)
      },
    })
    await expect.poll(() => coins(page)).toBeGreaterThan(start)
    const afterDrag = await coins(page)
    await serveOne(page, 'tap', {
      asking: async () => {
        await page.getByRole('button', { name: 'Ajuda' }).click()
        await expect(page.getByTestId('errand-hint')).toBeVisible()
      },
    })
    await expect.poll(() => coins(page)).toBeGreaterThan(afterDrag)

    // Free play: whoever sits in chair 1 gets the tools in order; the mirror shows her.
    const mirror = page.getByTestId('mirall')
    await expect(mirror).toBeVisible()
    const customerInChair = room.locator('[data-actor][data-mode="sitting"]').first()
    await expect(customerInChair).toBeVisible()
    const before = await mirror.innerHTML()
    for (const tool of ['la dutxa', 'la pinta', 'les tisores', 'l’esprai de color']) {
      // The character may stand over the tool: the tap goes straight to the object.
      const me = room.locator('[data-actor="laia"]')
      await room.getByRole('button', { name: tool, exact: true }).dispatchEvent('click')
      await expect(me).toHaveAccessibleName(/porta/)
      // The customer sits over the drop spot: the tap goes straight to it.
      await room.locator('[data-surface="eina-cadira-1"]').dispatchEvent('click')
      await expect(me).not.toHaveAccessibleName(/porta/)
    }
    await expect.poll(() => mirror.innerHTML()).not.toBe(before)
    await page.waitForTimeout(500)
    await shot(page, 'perruqueria-sandbox-mirall', project)
    expect(await hasHorizontalScroll(page)).toBe(false)
    if (isLandscape(page)) {
      const overflow = await page.evaluate(() => {
        const main = document.querySelector('main')
        return main ? main.scrollHeight - main.clientHeight : 0
      })
      expect(overflow).toBeLessThanOrEqual(1)
    }
    expect(consoleErrors).toEqual([])
  })
})
