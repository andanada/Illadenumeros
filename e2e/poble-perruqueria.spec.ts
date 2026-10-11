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

/** The middle of every piece of the pile answers to its own touch (no neighbour hides it), when the pile is of a usual size. */
async function expectPileTouchable(page: Page, selector: string): Promise<void> {
  const hidden = await page.evaluate((sel) => {
    const pieces = Array.from(document.querySelectorAll<HTMLElement>(sel))
    if (pieces.length > 10) return []
    return pieces.flatMap((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.bottom - 22)
      // A character standing over a piece passes the tap on to it.
      return hit?.closest('[data-uid]') === el || hit?.closest('[data-actor]') ? [] : [el.getAttribute('data-uid')]
    })
  }, selector)
  expect(hidden).toEqual([])
}

/** Puts one clip from the box on a side of the head: tap it and tap the side, or reach both with the keyboard. */
async function clipOn(page: Page, method: 'keyboard' | 'tap', zoneId: string): Promise<void> {
  const zone = page.locator(`[data-zone="${zoneId}"]`)
  const before = Number(await zone.getAttribute('data-count'))
  // The clips of the box overlap a little: the tap goes straight to the first one.
  const piece = page.locator('[data-def="pinca"]:not([data-in])').first()
  const drop = page.locator(`[data-zone-drop="${zoneId}"]`)
  if (method === 'keyboard') {
    await piece.focus()
    await page.keyboard.press('Enter')
    await expect(drop).toBeAttached()
    await drop.focus()
    await page.keyboard.press('Enter')
  } else {
    await piece.dispatchEvent('click')
    await expect(drop).toBeAttached()
    await drop.dispatchEvent('click')
  }
  await expect(zone).toHaveAttribute('data-count', String(before + 1), { timeout: 15_000 })
}

/** Solves the clips errand on her head: the clips to add, alternating sides. Returns false when the request cannot be read. */
async function solveClips(page: Page, method: 'keyboard' | 'tap'): Promise<boolean> {
  const request = (await page.getByTestId('errand-request').innerText()).replace(/\s+/g, ' ')
  const pair = /: (\d+) \+ (\d+)\./.exec(request)
  const more = /Ja porto (\d+) \S+ i en vull (\d+)/.exec(request)
  const n = pair ? Number(pair[1]) + Number(pair[2]) : more ? Number(more[2]) - Number(more[1]) : undefined
  if (n === undefined) return false
  for (let i = 0; i < n; i++) await clipOn(page, method, i % 2 === 0 ? 'pinces-esq' : 'pinces-dre')
  await page.getByRole('button', { name: 'Ja està!' }).click()
  return true
}

async function serveOne(page: Page, method: 'keyboard' | 'tap', hooks: { asking?: () => Promise<void>; thanked?: () => Promise<void> } = {}): Promise<void> {
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

/**
 * The customer who asked sat in chair 1 and goes home when she has waited long enough (customers come and go). Like the
 * child would, wait until somebody sits in chair 1: the next customer with a wish takes it and is never sent away
 * while she waits.
 */
async function waitForChair1(page: Page, room: Locator): Promise<void> {
  const inChair1 = room.locator('[data-actor][data-mode="sitting"][data-x="0.360"]')
  for (let i = 0; i < 8 && (await inChair1.count()) === 0; i++) {
    await page.clock.fastForward(30_000)
    await page.waitForTimeout(1_500)
  }
  await expect(inChair1).toHaveCount(1, { timeout: 15_000 })
}

const isLandscape = (page: Page): boolean => {
  const size = page.viewportSize()
  return !!size && size.width > size.height
}

test.describe('Perruqueria (sandbox)', () => {
  test('a customer asks for clips with a bubble: done on her head by keyboard and by tap; then the chain of tools restyles her, the mirror follows', async ({ page, consoleErrors }, testInfo) => {
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

    await serveOne(page, 'keyboard', {
      asking: async () => {
        await expect(page.getByTestId('errand-request')).toBeInViewport()
        await expect(page.getByRole('button', { name: 'Ara no' })).toBeInViewport()
        await expect(page.getByRole('button', { name: 'Ja està!' })).toBeInViewport()
        await page.waitForTimeout(600)
        await expectPileTouchable(page, '[data-def="pinca"]:not([data-in])')
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
    await waitForChair1(page, room)
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
