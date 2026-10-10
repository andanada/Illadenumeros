import type { Browser, Locator, Page } from '@playwright/test'
import { CHILD, completeDiagnostic, createProfile, expect, hasHorizontalScroll, playerDbNames, test as base } from './helpers'

type StorageState = Awaited<ReturnType<Awaited<ReturnType<Browser['newContext']>>['storageState']>>

/** A profile that finished the first day, created once per worker through the UI (waits for the street itself). */
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

type Method = 'drag' | 'tap'

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

/** Moves one prop to a zone: drag it, or tap it and then tap the place. */
async function moveProp(page: Page, method: Method, prop: Locator, zone: Locator): Promise<void> {
  if (method === 'drag') return dragToPoint(page, prop, await centre(zone))
  await prop.click()
  await zone.click()
}

/** Writes today's errand board straight into the player's database (a fixed, tiny board). */
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
      // The day opened by the first visit is forgotten: the next load migrates this board.
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

async function enterTown(page: Page, tasks: readonly Record<string, unknown>[]): Promise<void> {
  await page.goto('/#/poble')
  await expect(page.getByTestId('street')).toBeVisible()
  await seedBoard(page, tasks)
  await page.reload()
  await expect(page.getByTestId('street')).toBeVisible()
}

/** Walks the street with the arrows until the door is in the clear middle of the screen, then goes in. */
async function enterPlace(page: Page, name: RegExp): Promise<void> {
  const door = page.getByRole('button', { name })
  const width = page.viewportSize()?.width ?? 1024
  for (let i = 0; i < 20; i++) {
    const box = await door.boundingBox()
    const x = box ? box.x + box.width / 2 : -1000
    if (x > 110 && x < width - 110) break
    await page.getByRole('button', { name: x < width / 2 ? 'Camina cap a l’esquerra' : 'Camina cap a la dreta' }).click()
    await page.waitForTimeout(450)
  }
  await door.click()
}

/** Puts `n` items from `source` into `zone`. */
async function repeatMove(page: Page, method: Method, n: number, source: () => Locator, zone: () => Locator): Promise<void> {
  for (let i = 0; i < n; i++) await moveProp(page, method, source(), zone())
}

type Solver = (page: Page, method: Method, request: string) => Promise<boolean>

const solveBowl: Solver = async (page, method, request) => {
  const sum = /: (\d+) \+ (\d+) /.exec(request)
  const fill = /ja n’hi ha (\d+): .* = (\d+)\./.exec(request)
  const n = sum ? Number(sum[1]) + Number(sum[2]) : fill ? Number(fill[2]) - Number(fill[1]) : undefined
  if (n === undefined) return false
  await repeatMove(page, method, n, () => page.locator('[data-prop-kind="ingredient-pot"]'), () => page.locator('[data-zone-id="bol"]'))
  await page.getByRole('button', { name: 'Ja està!' }).click()
  return true
}

test.describe('Casa', () => {
  test('walk up the stairs carrying fruit, answer a family request by drag and by tap, decorate and keep it', async ({ page, consoleErrors }, testInfo) => {
    test.setTimeout(150_000)
    const project = testInfo.project.name
    await enterTown(page, [{ place: 'casa', count: 3, kind: 'repte', neighbour: 'senyora-pilar' }])
    await enterPlace(page, /^Entra a (la )?Casa$/i)
    await expect(page.getByRole('region', { name: 'La Casa', exact: true })).toBeVisible()
    for (const floor of ['Planta baixa', 'Primer pis', 'Golfes']) await expect(page.getByRole('region', { name: floor, exact: true })).toBeAttached()
    await expect(page.locator('[data-actor="jo"]')).toBeVisible()
    await shot(page, 'casa-planta-baixa', project)
    expect(await hasHorizontalScroll(page)).toBe(false)

    // Take the fruit from the fridge and carry it up to the first floor: the stairs are walked, not teleported.
    await page.locator('[data-def="nevera"]').click()
    await expect(page.locator('[data-def="nevera"]')).toHaveAttribute('data-open', 'true')
    await page.locator('[data-uid="poma-1"]').click()
    await expect(page.locator('[data-actor="jo"]')).toHaveAccessibleName(/porta la poma/)
    await page.locator('[data-stair="escala-baixa-up"]').click()
    await expect(page.locator('[data-floor="pis"] [data-actor="jo"]')).toBeAttached({ timeout: 15_000 })
    await expect(page.locator('[data-actor="jo"]')).toHaveAccessibleName(/porta la poma/)
    await page.waitForTimeout(1200)
    await shot(page, 'casa-pis-amb-poma', project)

    // Bubbles over the family: ignoring them is fine, answering gives coins.
    const bubble = page.locator('[data-anchor="waiting"]').first()
    await expect(bubble).toBeAttached({ timeout: 20_000 })
    await bubble.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await shot(page, 'casa-bombolla', project)
    await bubble.click({ force: true })
    const sheet = page.getByRole('region', { name: /^Encàrrec a la Casa/ })
    await expect(sheet).toBeVisible()
    await expect(page.getByTestId('errand-request')).toBeInViewport()
    await page.getByRole('button', { name: 'Ara no' }).click()
    await expect(sheet).toHaveCount(0)

    for (const method of ['drag', 'tap'] as const) {
      const before = await coins(page)
      // The next request comes when the day's pacing says so (a few seconds).
      await expect(page.locator('[data-anchor="waiting"]').first()).toBeAttached({ timeout: 45_000 })
      await page.locator('[data-anchor="waiting"]').first().click({ force: true })
      await expect(page.locator('[data-errand-kind]')).toBeVisible()
      if (method === 'tap') {
        await page.getByRole('button', { name: 'Ajuda' }).click()
        await expect(page.getByTestId('errand-hint')).toBeVisible()
        await shot(page, 'casa-peticio-ajuda', project)
      } else await shot(page, 'casa-peticio', project)
      const text = (await page.getByTestId('errand-request').innerText()).replace(/\s+/g, ' ')
      if (!(await solveBowl(page, method, text))) {
        await page.getByRole('button', { name: 'Ara no' }).click()
        continue
      }
      await expect(page.getByRole('button', { name: 'Adéu!' })).toBeVisible()
      await page.getByRole('button', { name: 'Adéu!' }).click()
      await expect.poll(() => coins(page)).toBeGreaterThan(before)
    }

    // Decorate: a free piece from the catalogue dragged into the living room, moved, and still there after a reload.
    await page.getByRole('button', { name: 'Decora', exact: true }).click()
    await page.getByRole('button', { name: 'Mobles', exact: true }).click()
    const catalogue = page.getByRole('region', { name: 'Catàleg de mobles' })
    await expect(catalogue).toBeVisible()
    await shot(page, 'casa-cataleg', project)
    const zone = page.locator('[data-zone-id="zona-sala"]')
    const box = await zone.boundingBox()
    if (!box) throw new Error('Sense zona de la sala')
    const before = await page.locator('[data-placed]').count()
    await dragToPoint(page, catalogue.locator('[data-prop-kind="moble-cataleg"]').first(), { x: box.x + box.width * 0.6, y: box.y + box.height * 0.8 })
    await expect(page.locator('[data-placed]')).toHaveCount(before + 1)
    await expect(page.getByRole('toolbar', { name: /Què fem amb/ })).toBeVisible()
    await shot(page, 'casa-moble-triat', project)
    const placed = page.locator('[data-placed]').last()
    const at = await placed.boundingBox()
    await page.getByRole('button', { name: 'Mou-ho a la dreta' }).click()
    await expect.poll(async () => (await placed.boundingBox())?.x ?? 0).toBeGreaterThan((at?.x ?? 0) + 5)
    await page.getByRole('button', { name: 'Fet', exact: true }).first().click()
    await page.reload()
    await enterPlace(page, /^Entra a (la )?Casa$/i)
    await expect(page.locator('[data-placed]')).toHaveCount(before + 1)
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })

  test('sit on the sofa; night dims the floors and each floor has its own light', async ({ page, consoleErrors }, testInfo) => {
    await enterTown(page, [])
    await enterPlace(page, /^Entra a (la )?Casa$/i)
    await page.locator('[data-seat="sofa-0"]').click({ position: { x: 12, y: 24 } })
    await expect(page.locator('[data-actor="jo"]')).toHaveAttribute('data-mode', 'sitting', { timeout: 15_000 })
    await page.getByRole('button', { name: 'Fes de nit' }).click()
    await expect(page.getByTestId('nit-baixa')).toHaveAttribute('data-dark', 'true')
    await page.getByRole('button', { name: /Llum de planta baixa/ }).click()
    await expect(page.getByTestId('nit-baixa')).toHaveAttribute('data-dark', 'false')
    await page.waitForTimeout(800)
    await shot(page, 'casa-nit', testInfo.project.name)
    await page.getByRole('button', { name: 'Fes de dia' }).click()
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })
})
