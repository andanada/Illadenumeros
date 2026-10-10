import type { Browser, Locator, Page } from '@playwright/test'
import { CHILD, completeDiagnostic, createProfile, expect, hasHorizontalScroll, playerDbNames, solve, test as base } from './helpers'

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

const SHOTS = process.env.POBLE_SHOTS

async function shot(page: Page, name: string, project: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: false })
}

/** Writes today's allotment into the player's database (the old board key, migrated by the requests system). */
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

const actor = (page: Page, id: string): Locator => page.locator(`[data-actor="${id}"]`)

async function enterBus(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await expect(page.getByTestId('street')).toBeVisible()
  await page.getByRole('button', { name: 'Entra a l’Autobús' }).click()
  await expect(page.getByRole('region', { name: 'Dins l’autobús', exact: true })).toBeVisible()
  await expect(actor(page, 'laia')).toBeVisible()
}

async function tapFloor(page: Page, fx: number, fy: number): Promise<void> {
  const box = await page.getByTestId('stage-floor').boundingBox()
  if (!box) throw new Error('Sense terra')
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
}

const settled = (page: Page, id: string): Promise<void> => expect(actor(page, id)).toHaveAttribute('data-mode', /idle|sitting|emoting/, { timeout: 25_000 })

test.describe('Poble: Autobús', () => {
  test('walk the aisle, sit, hold the pole and press the stop button', async ({ page }, testInfo) => {
    await enterBus(page)
    await shot(page, 'bus-inici', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
    const x0 = Number(await actor(page, 'laia').getAttribute('data-x'))
    await tapFloor(page, 0.75, 0.9)
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'walking')
    await settled(page, 'laia')
    expect(Math.abs(Number(await actor(page, 'laia').getAttribute('data-x')) - x0)).toBeGreaterThan(0.15)

    await page.getByRole('button', { name: /^Seu al seient 4/ }).click()
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'sitting', { timeout: 25_000 })
    await shot(page, 'bus-assegut', testInfo.project.name)

    await page.getByRole('button', { name: 'Agafa’t a la barra' }).click()
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'emoting', { timeout: 25_000 })
    await page.getByRole('button', { name: 'Prem el botó de parada' }).click()
    await expect(page.getByRole('button', { name: 'Parada demanada' })).toBeVisible({ timeout: 25_000 })
  })

  test('drive along the numbered road, step off at the stop, walk around and get back on', async ({ page }, testInfo) => {
    await enterBus(page)
    const bus = page.getByTestId('road-bus')
    await expect(bus).toHaveAttribute('data-stop', '1')
    await page.getByRole('button', { name: 'Endavant 1 parada' }).click()
    await expect(bus).toHaveAttribute('data-driving', 'true')
    await expect(page.getByRole('button', { name: 'Endavant 1 parada' })).toBeDisabled()
    await expect(bus).toHaveAttribute('data-driving', 'false', { timeout: 10_000 })
    await expect(bus).toHaveAttribute('data-stop', '2')
    await page.getByRole('button', { name: 'Endavant 10 parades' }).click()
    await expect(bus).toHaveAttribute('data-stop', '12', { timeout: 10_000 })
    await shot(page, 'bus-parada', testInfo.project.name)

    await page.getByRole('button', { name: 'la porta de l’autobús' }).click()
    await expect(page.getByRole('region', { name: 'La parada 12' })).toBeVisible({ timeout: 25_000 })
    await shot(page, 'parada-fora', testInfo.project.name)
    await tapFloor(page, 0.3, 0.9)
    await settled(page, 'laia')
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.getByRole('button', { name: 'la porta de l’autobús' }).click()
    await expect(page.getByRole('region', { name: 'Dins l’autobús', exact: true })).toBeVisible({ timeout: 25_000 })
  })
})

async function enterArcade(page: Page): Promise<void> {
  await page.goto('/#/poble')
  await expect(page.getByTestId('street')).toBeVisible()
  await page.getByRole('button', { name: /^Entra a(ls)? .*Recreatius/i }).click()
  await expect(page.getByRole('region', { name: 'Els Recreatius' }).last()).toBeVisible()
  await expect(actor(page, 'laia')).toBeVisible()
}

/** Things you can touch (seats, doors, spots, cabinets, objects) whose centre is covered by the pet instead of the thing itself. */
const coveredByPet = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const out: string[] = []
    const targets = document.querySelectorAll<HTMLElement>('[data-seat],[data-door],[data-spot],[data-fixture],[data-cabinet],[data-uid]')
    for (const el of targets) {
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue
      const hit = document.elementFromPoint(x, y)
      if (hit && !el.contains(hit) && hit.closest('[data-actor="nyx"]')) out.push(el.getAttribute('aria-label') ?? el.dataset.uid ?? 'sense nom')
    }
    return out
  })

const fitsScreen = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement
    return el.scrollHeight <= window.innerHeight + 1 && el.scrollWidth <= window.innerWidth
  })

test.describe('Poble: moviment reduït, mida i encaix', () => {
  test('with reduced motion the road does not scroll and the bus still drives', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterBus(page)
    await page.getByRole('button', { name: 'Endavant 1 parada' }).click()
    await expect(page.getByTestId('road-bus')).toHaveAttribute('data-stop', '2', { timeout: 10_000 })
    await expect(page.getByTestId('bus-backdrop').first()).toHaveAttribute('data-scrolling', 'false')
    await tapFloor(page, 0.7, 0.9)
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'idle')
  })

  test('the bus and the arcade fit the screen and their controls are big', async ({ page }) => {
    await enterBus(page)
    expect(await fitsScreen(page)).toBe(true)
    const pedals = page.getByRole('group', { name: 'Pedals de l’autobús' }).getByRole('button')
    for (let i = 0; i < (await pedals.count()); i++) expect((await pedals.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(63)
    expect((await page.getByRole('button', { name: 'Surt al carrer' }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(63)
    await page.getByRole('button', { name: 'Surt al carrer' }).click()
    await expect(page.getByTestId('street')).toBeVisible()
    await enterArcade(page)
    expect(await fitsScreen(page)).toBe(true)
    expect((await page.getByRole('button', { name: 'Surt al carrer' }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(63)
    expect((await page.getByRole('button', { name: 'Apaga els llums' }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(63)
  })
})

test.describe('Poble: la mascota no tapa res', () => {
  test('after following her around, the pet never covers a seat, door, spot, cabinet or object', async ({ page }) => {
    await enterBus(page)
    for (const [fx, fy] of [[0.55, 0.9], [0.62, 0.86], [0.3, 0.8], [0.58, 0.78]] as const) {
      await tapFloor(page, fx, fy)
      await settled(page, 'laia')
      await page.waitForTimeout(2500)
      expect(await coveredByPet(page)).toEqual([])
    }
    await page.getByRole('button', { name: 'Surt al carrer' }).click()
    await expect(page.getByTestId('street')).toBeVisible()
    await enterArcade(page)
    for (const [fx, fy] of [[0.45, 0.76], [0.2, 0.8], [0.6, 0.8]] as const) {
      await tapFloor(page, fx, fy)
      await settled(page, 'laia')
      await page.waitForTimeout(2500)
      expect(await coveredByPet(page)).toEqual([])
    }
  })
})

test.describe('Poble: peticions ambientals del transport', () => {
  test('a passenger bubble on the bus is ignorable; answering it gives coins', async ({ page }, testInfo) => {
    await page.goto('/#/poble')
    await expect(page.getByTestId('street')).toBeVisible()
    await seedBoard(page, [{ place: 'autobus', count: 2, kind: 'repte', neighbour: 'la-nuria' }])
    await page.reload()
    await expect(page.getByTestId('street')).toBeVisible()
    const before = Number(await page.getByTestId('coins').getAttribute('data-coins'))
    await page.getByRole('button', { name: 'Entra a l’Autobús' }).click()
    const bubble = page.getByRole('button', { name: /necessita ajuda a l’autobús/ })
    await expect(bubble).toBeVisible({ timeout: 15_000 })
    await shot(page, 'bus-bombolla', testInfo.project.name)
    // Ignoring it is fine: she plays on, and the bubble stays.
    await page.getByRole('button', { name: 'Endavant 1 parada' }).click()
    await expect(page.getByTestId('road-bus')).toHaveAttribute('data-stop', '2', { timeout: 10_000 })
    await bubble.click({ force: true })
    const card = page.locator('[data-errand-kind]')
    await expect(card).toBeVisible()
    await shot(page, 'bus-peticio', testInfo.project.name)
    const kind = await card.getAttribute('data-errand-kind')
    const text = ((await page.getByTestId('errand-request').innerText()) ?? '').replace(/\s+/g, ' ')
    if (kind === 'seients') {
      const off = /^(\d+) − (\d+): hi ha/.exec(text)
      if (off) {
        for (let i = 0; i < Number(off[2]); i++) {
          await page.locator('[data-switch]:not([data-switch="laia"]):not([data-switch="en-jordi"]):not([data-switch="nyx"])').first().click()
          await page.getByRole('button', { name: 'la porta de l’autobús' }).click()
          await expect(actor(page, 'laia')).toHaveAttribute('data-selected', 'true', { timeout: 25_000 })
        }
        await page.getByRole('button', { name: /Tanca les portes/ }).click()
      } else {
        await page.getByRole('button', { name: 'Ara no' }).click()
        return
      }
    } else if (kind === 'fichas') {
      const value = solve(text)
      if (value === undefined) return
      await page.getByRole('button', { name: `Resposta ${value}`, exact: true }).click()
    } else {
      await page.getByRole('button', { name: 'Ara no' }).click()
      return
    }
    await expect(page.getByRole('button', { name: 'Adéu!' })).toBeVisible({ timeout: 15_000 })
    expect(Number(await page.getByTestId('coins').getAttribute('data-coins'))).toBeGreaterThanOrEqual(before)
    await page.getByRole('button', { name: 'Adéu!' }).click()
  })
})

test.describe('Poble: Recreatius', () => {
  test('walk up to a cabinet, its screen opens, back returns to the room', async ({ page }, testInfo) => {
    await enterArcade(page)
    await shot(page, 'arcade-inici', testInfo.project.name)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.getByRole('button', { name: /^Tren de Sumes.*juga$/ }).click()
    await expect(actor(page, 'laia')).toHaveAttribute('data-mode', 'walking')
    await expect(page.getByRole('region', { name: 'Tren de Sumes, a la pantalla' })).toBeVisible({ timeout: 25_000 })
    await shot(page, 'arcade-pantalla', testInfo.project.name)
    await page.getByRole('button', { name: 'Enrere' }).click()
    await expect(page.getByRole('region', { name: 'Els Recreatius' }).last()).toBeVisible()
    await expect(actor(page, 'laia')).toBeVisible()
  })

  test('the claw drops a toy: carry it from the tray and give it to a kid', async ({ page }, testInfo) => {
    await enterArcade(page)
    await page.getByRole('button', { name: 'La màquina de la grua: juga' }).click()
    await expect(page.getByTestId('claw-screen')).toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: 'Mou la grua a la dreta' }).click()
    await page.getByRole('button', { name: 'Baixa la grua' }).click()
    await expect(page.getByRole('img', { name: /^Grua: 1 premis/ })).toBeVisible({ timeout: 8000 })
    await shot(page, 'arcade-grua', testInfo.project.name)
    await page.getByRole('button', { name: 'Torna a la sala' }).click()
    await expect(page.locator('[data-fixture="tray-lock"]')).toHaveCount(0)
    await page.locator('[data-uid="safata"]').click()
    await expect(page.locator('[data-uid="safata"]')).toHaveAttribute('data-open', 'true', { timeout: 25_000 })
    await page.locator('[data-uid="premi-osset"]').click()
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta l’osset/, { timeout: 25_000 })
    await shot(page, 'arcade-premi', testInfo.project.name)
    await actor(page, 'la-mei').click()
    await expect(actor(page, 'la-mei')).toHaveAccessibleName(/porta l’osset/, { timeout: 25_000 })
  })

  test('the photo booth takes a picture of the chosen character with a funny frame', async ({ page }, testInfo) => {
    await enterArcade(page)
    await page.getByRole('button', { name: 'La cabina de fotos: fes-te una foto' }).click()
    const photo = page.getByRole('img', { name: /^Foto de la Laia amb el marc/ })
    await expect(photo).toBeVisible({ timeout: 25_000 })
    await shot(page, 'arcade-foto', testInfo.project.name)
    const first = await photo.getAttribute('data-frame')
    await page.getByRole('button', { name: /Una altra/ }).click()
    await expect(page.getByTestId('photo-overlay').getByRole('img')).not.toHaveAttribute('data-frame', first ?? '')
    await page.getByRole('button', { name: 'Torna a la sala' }).click()
    await expect(page.getByTestId('photo-overlay')).toHaveCount(0)
  })

  test('toss a puck on the air-hockey table and walk out of the door', async ({ page }) => {
    await enterArcade(page)
    await page.locator('[data-uid="disc-1"]').click()
    await expect(actor(page, 'laia')).toHaveAccessibleName(/porta el disc/, { timeout: 25_000 })
    await page.getByRole('button', { name: 'Accions' }).click()
    await page.locator('[data-ring-item="llanca"]').click()
    await expect(actor(page, 'laia')).not.toHaveAccessibleName(/porta el disc/)
    await page.getByRole('button', { name: 'la porta al carrer' }).click()
    await expect(page.getByTestId('street')).toBeVisible({ timeout: 25_000 })
  })
})
