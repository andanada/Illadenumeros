import type { Locator, Page } from '@playwright/test'
import { CHILD, completeDiagnostic, createProfile, expect, hasHorizontalScroll, playerDbNames, seededTest as test, solve, test as freshTest } from './helpers'

/** Screenshots for the design review go here (outside the repo when POBLE_SHOTS is set). */
const SHOTS = process.env.POBLE_SHOTS

type Method = 'drag' | 'tap'

async function shot(page: Page, name: string, project: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${project}-${name}.png`, fullPage: false })
}

async function coins(page: Page): Promise<number> {
  return Number(await page.getByTestId('coins').getAttribute('data-coins'))
}

/** Drag with real pointer events, in small steps like a finger. */
async function drag(page: Page, from: Locator, to: Locator): Promise<void> {
  const a = await from.boundingBox()
  const b = await to.boundingBox()
  if (!a || !b) throw new Error('Element sense caixa per arrossegar')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 4, { steps: 3 })
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 })
  await page.mouse.up()
}

/** Move one prop to a zone: drag it, or tap it and then tap the place. */
async function moveProp(page: Page, method: Method, prop: Locator, zone: Locator): Promise<void> {
  if (method === 'drag') return drag(page, prop, zone)
  await prop.click()
  await zone.click()
}

const euros = (text: string): number => {
  const m = /(\d+)(?:,(\d{2}))?\s*€/.exec(text)
  return m ? Number(m[1]) * 100 + Number(m[2] ?? 0) : NaN
}

function greedy(cents: number): number[] {
  const out: number[] = []
  let left = cents
  for (const d of [2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]) while (left >= d) (out.push(d), (left -= d))
  return out
}

const pieceName = (c: number): RegExp => new RegExp(`^(la moneda|el bitllet) de ${c < 100 ? `${c} cts` : `${c / 100} €`}$`)

/** Solves the errand on the counter. Returns false when it cannot read it (the neighbour is sent away). */
async function solveErrand(page: Page, method: Method): Promise<boolean> {
  const stage = page.locator('[data-errand-kind]')
  await expect(stage).toBeVisible()
  const kind = await stage.getAttribute('data-errand-kind')
  const request = (await page.getByTestId('errand-request').innerText()).replace(/\s+/g, ' ')
  if (kind === 'cistella') {
    const crate = page.locator('[data-prop-kind="producte-caixa"]')
    const basket = page.locator('[data-zone-id="cistella"]')
    const sum = /Vull (\d+) \+ (\d+)/.exec(request)
    const missing = /Tinc (\d+) .*en vull (\d+)/.exec(request)
    const take = /^(\d+) − (\d+):/.exec(request)
    if (sum) for (let i = 0; i < Number(sum[1]) + Number(sum[2]); i++) await moveProp(page, method, crate, basket)
    else if (missing) for (let i = 0; i < Number(missing[2]) - Number(missing[1]); i++) await moveProp(page, method, crate, basket)
    else if (take) for (let i = 0; i < Number(take[2]); i++) await moveProp(page, method, page.locator('[data-prop-kind="producte-cistella"]'), page.locator('[data-zone-id="caixa"]'))
    else return false
    await page.getByRole('button', { name: 'Ja està!' }).click()
    return true
  }
  if (kind === 'canvi') {
    const m = /costa (.+?) i et pago amb (.+?)\./.exec(request)
    if (!m?.[1] || !m[2]) return false
    for (const c of greedy(euros(m[2]) - euros(m[1]))) await moveProp(page, method, page.getByRole('list', { name: 'Calaix de la caixa' }).getByRole('button', { name: pieceName(c) }).first(), page.locator('[data-zone-id="safata"]'))
    await page.getByRole('button', { name: 'Dona el canvi' }).click()
    return true
  }
  const value = solve(request)
  if (value === undefined) return false
  const tag = page.getByRole('button', { name: `Resposta ${value}`, exact: true })
  if (method === 'tap') await tag.click()
  else await drag(page, tag, page.locator('[data-zone-id="ma-veina"]'))
  return true
}

interface ServeHooks {
  /** While the neighbour is asking (before any move). */
  asking?: () => Promise<void>
  /** After the thank-you, before "Adéu!". */
  thanked?: () => Promise<void>
}

/** Serves neighbours until one is solved with `method`. */
async function serveOne(page: Page, method: Method, hooks: ServeHooks = {}): Promise<void> {
  for (let tries = 0; tries < 25; tries++) {
    const call = page.getByRole('button', { name: 'Fes passar un veí' })
    if (await call.isVisible()) await call.click()
    await expect(page.locator('[data-errand-kind]')).toBeVisible()
    await hooks.asking?.()
    if (await solveErrand(page, method)) {
      await expect(page.getByRole('button', { name: 'Adéu!' })).toBeVisible()
      await hooks.thanked?.()
      await page.getByRole('button', { name: 'Adéu!' }).click()
      return
    }
    await page.getByRole('button', { name: 'Ara no' }).click()
  }
  throw new Error(`Cap encàrrec resolt amb ${method}`)
}

/** Writes today's allotment straight into the player's database (the old board key, which the requests system migrates): a fixed, tiny day. */
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

/** Makes the player look like one from before the avatar existed (no chosen character yet). */
async function setAvatarUnchosen(page: Page): Promise<void> {
  const dbName = (await playerDbNames(page))[CHILD.name]
  if (!dbName) throw new Error('No hi ha base de dades del jugador')
  await page.evaluate(async (name) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(name)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const store = (mode: IDBTransactionMode) => database.transaction('world', mode).objectStore('world')
    const row = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const req = store('readonly').get('world')
      req.onsuccess = () => resolve(req.result as Record<string, unknown>)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const req = store('readwrite').put({ ...row, avatarUpdatedAt: 0 })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
    database.close()
  }, dbName)
}

/** Opens the town with a small, known day: `botiga` requests to do at the shop (the rest of the day is empty). */
async function enterTown(page: Page, botiga = 3): Promise<void> {
  await page.goto('/#/poble')
  const street = page.getByTestId('street')
  await expect(street).toBeVisible()
  await seedBoard(page, [{ place: 'botiga', count: botiga, kind: 'repte', neighbour: 'senyora-pilar' }])
  await page.reload()
  await expect(street).toBeVisible()
}

async function enterShop(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Entra a la Botiga' }).click()
  await expect(page.getByRole('region', { name: 'La Botiga', exact: true })).toBeVisible()
}

/** The neighbour named in the errand region is drawn, on screen. */
async function expectNeighbourVisible(page: Page): Promise<void> {
  const stage = page.locator('[data-errand-kind]')
  const label = (await stage.getAttribute('aria-label')) ?? ''
  const name = label.replace(/^Encàrrec a la Botiga: /, '')
  expect(name.length).toBeGreaterThan(0)
  await expect(stage.getByRole('img', { name, exact: true })).toBeInViewport({ ratio: 0.4 })
}

const isLandscape = (page: Page): boolean => {
  const size = page.viewportSize()
  return !!size && size.width > size.height
}

/** The errand is above the fold; on landscape screens (iPad, desktop) the shop does not scroll at all. */
async function expectErrandFits(page: Page): Promise<void> {
  await expect(page.getByTestId('errand-request')).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Ara no' })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Ajuda' })).toBeInViewport()
  if (!isLandscape(page)) return
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('main')
    return main ? main.scrollHeight - main.clientHeight : 0
  })
  expect(overflow).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: /caixa registradora/ })).toBeInViewport()
  await expect(page.getByRole('button', { name: /gata Mixa/ })).toBeInViewport()
  const submit = page.getByRole('button', { name: /^(Ja està!|Dona el canvi)$/ })
  if ((await submit.count()) > 0) await expect(submit).toBeInViewport()
}

test.describe('El Poble dels Números', () => {
  test('pan the street, enter the shop, the neighbour asks at the counter, solve by drag and by tapping', async ({ page, consoleErrors }, testInfo) => {
    const project = testInfo.project.name
    await enterTown(page)
    const street = page.getByTestId('street')
    await shot(page, 'carrer', project)
    expect(await hasHorizontalScroll(page)).toBe(false)

    const shop = page.getByRole('button', { name: 'Entra a la Botiga' })
    const before = (await shop.boundingBox())?.x ?? 0
    const box = await street.boundingBox()
    if (!box) throw new Error('Sense carrer')
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 10 })
    await page.mouse.up()
    await expect.poll(async () => (await shop.boundingBox())?.x ?? 0).toBeLessThan(before - 40)
    await page.getByRole('button', { name: 'Camina cap a l’esquerra' }).click()

    await expect(page.getByTestId('street-hint-botiga')).toBeVisible()
    await shot(page, 'carrer-globus', project)
    await enterShop(page)
    // Only the waiting request is at the counter; nobody is queueing yet (the governor is gentle).
    await expect(page.getByTestId('door-queue')).toHaveAttribute('data-waiting', '0')
    const start = await coins(page)

    await serveOne(page, 'drag', {
      asking: async () => {
        await expectNeighbourVisible(page)
        await expectErrandFits(page)
        await page.waitForTimeout(1600)
        await shot(page, 'botiga-encarrec', project)
      },
      thanked: async () => {
        await expect(page.getByTestId('errand-neighbour')).toHaveAttribute('data-pose', 'cheer')
        await page.waitForTimeout(450)
        await shot(page, 'botiga-gracies', project)
      },
    })
    await expect.poll(() => coins(page)).toBeGreaterThan(start)
    const afterDrag = await coins(page)
    await serveOne(page, 'tap', {
      asking: async () => {
        await expectNeighbourVisible(page)
        await page.getByRole('button', { name: 'Ajuda' }).click()
        await expect(page.getByTestId('errand-hint')).toBeVisible()
        await page.waitForTimeout(800)
        await shot(page, 'botiga-ajuda', project)
      },
    })
    await expect.poll(() => coins(page)).toBeGreaterThan(afterDrag)

    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.getByRole('button', { name: 'Surt al carrer' }).click()
    await expect(street).toBeVisible()
    // Two solved requests = two of the three at the shop: the jar of stars is 67 %.
    await expect(page.getByTestId('star-jar')).toHaveAttribute('data-level', '67')
    expect(consoleErrors).toEqual([])
  })

  test('an existing player without a chosen character makes one first (then the street, never asked again)', async ({ page, consoleErrors }, testInfo) => {
    await page.goto('/#/poble')
    await expect(page.getByTestId('street')).toBeVisible()
    await setAvatarUnchosen(page)
    await page.reload()
    const creator = page.getByRole('region', { name: 'Crea el teu personatge' })
    await expect(creator).toBeVisible()
    await shot(page, 'creador', testInfo.project.name)
    await page.getByRole('radio', { name: 'Pell bruna' }).click()
    await page.getByRole('button', { name: 'Fet!' }).click()
    await expect(page.getByTestId('street')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('street')).toBeVisible()
    await expect(creator).toHaveCount(0)
    expect(consoleErrors).toEqual([])
  })

  test('the town is home: / and the old /map lead to the street; the album is in the HUD; no map button', async ({ page, consoleErrors }, testInfo) => {
    await page.goto('/')
    await expect(page).toHaveURL(/#\/poble$/)
    await expect(page.getByTestId('street')).toBeVisible()
    await page.goto('/#/map')
    await expect(page).toHaveURL(/#\/poble$/)
    await expect(page.getByRole('button', { name: 'Mapa' })).toHaveCount(0)
    await expect(page.getByText('El Poble (nou!)')).toHaveCount(0)
    await page.waitForTimeout(900)
    await shot(page, 'carrer-v2', testInfo.project.name)
    await page.getByRole('button', { name: 'Àlbum de pegatines' }).click()
    await expect(page).toHaveURL(/#\/album$/)
    expect(consoleErrors).toEqual([])
  })

  test('a place not built yet stands behind scaffolding and says «Obrim aviat!» (no padlock)', async ({ page, consoleErrors }, testInfo) => {
    await enterTown(page)
    const fleca = page.getByRole('button', { name: 'La Fleca: obrim aviat' })
    await expect(fleca).toBeAttached()
    await fleca.focus()
    await page.waitForTimeout(900)
    await shot(page, 'carrer-obres', testInfo.project.name)
    await expect(fleca.getByText('Obrim aviat!')).toBeAttached()
    await fleca.dispatchEvent('click')
    await expect(page.getByTestId('street')).toBeVisible()
    expect(await page.getByTestId('street').getByText('🔒').count()).toBe(0)
    expect(consoleErrors).toEqual([])
  })

  test('free play first: waiting bubbles hang over the façades, the jar of stars is passive, a bubble takes her in', async ({ page, consoleErrors }, testInfo) => {
    const project = testInfo.project.name
    await page.clock.setFixedTime(new Date(2026, 9, 9, 12, 0, 0))
    await page.goto('/#/poble')
    await expect(page.getByTestId('street')).toBeVisible()
    // No errand board any more: no button, no dialog.
    await expect(page.getByRole('button', { name: /^Encàrrecs/ })).toHaveCount(0)
    const bubbles = page.locator('[data-testid^="street-hint-"]')
    await expect.poll(() => bubbles.count()).toBeGreaterThan(0)
    expect(await bubbles.count()).toBeLessThanOrEqual(3)
    await page.waitForTimeout(900)
    await shot(page, 'carrer-globus-dia', project)

    // The jar: empty at the start; tapping it only says what is left, in plain Catalan (no list).
    const jar = page.getByRole('button', { name: 'Tarro d’estrelles: 0 %' })
    await jar.click()
    const note = page.getByRole('status').filter({ hasText: 'estrelles' })
    await expect(note).toContainText('Al tarro li falten uns 12 minuts d’estrelles')
    await expect(page.getByRole('list', { name: 'Encàrrecs' })).toHaveCount(0)
    await shot(page, 'tarro', project)
    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.keyboard.press('Escape')
    await expect(note).toHaveCount(0)

    // Tapping a bubble goes in, and somebody is already waiting there (no "call a neighbour" needed).
    await bubbles.first().evaluate((el) => (el.querySelector('[data-request-bubble]') as HTMLElement).click())
    await expect(page.getByTestId('street')).toHaveCount(0, { timeout: 8000 })
    await expect(page.locator('[data-errand-kind], [data-warmup="true"]').first()).toBeAttached({ timeout: 8000 })
    expect(consoleErrors).toEqual([])
  })

  test('reaching the day’s target (the jar full) opens a surprise gift she gets for free, once', async ({ page, consoleErrors }, testInfo) => {
    const project = testInfo.project.name
    await page.clock.setFixedTime(new Date(2026, 9, 9, 12, 0, 0))
    await enterTown(page, 1)
    await expect(page.getByRole('button', { name: 'Tarro d’estrelles: 0 %' })).toBeVisible()
    await enterShop(page)
    // Solve one errand by tapping; the surprise pops up over the thank-you.
    for (let tries = 0; tries < 25; tries++) {
      const call = page.getByRole('button', { name: 'Fes passar un veí' })
      if (await call.isVisible()) await call.click()
      await expect(page.locator('[data-errand-kind]')).toBeVisible()
      if (await solveErrand(page, 'tap')) break
      await page.getByRole('button', { name: 'Ara no' }).click()
    }
    const gift = page.getByRole('dialog', { name: 'Sorpresa!' })
    await expect(gift).toBeVisible()
    await gift.getByRole('button', { name: 'Obre el regal' }).click()
    await expect(gift.getByRole('status')).toContainText('És per a tu.')
    await page.waitForTimeout(700)
    await shot(page, 'sorpresa', project)
    await gift.getByRole('button', { name: 'Que bé!' }).click()
    await expect(gift).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Tarro d’estrelles: 100 %' })).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('street')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tarro d’estrelles: 100 %' })).toBeVisible()
    await expect(page.locator('[data-testid^="street-hint-"]')).toHaveCount(0)
    await expect(page.getByRole('dialog', { name: 'Sorpresa!' })).toHaveCount(0)
    expect(consoleErrors).toEqual([])
  })

  test('L’armari: short of coins it says so kindly; with errand coins she buys a top, wears it, and it stays after reload', async ({ page, consoleErrors }, testInfo) => {
    const project = testInfo.project.name
    await enterTown(page, 30)
    await enterShop(page)
    for (let i = 0; i < 6 && (await coins(page)) < 8; i++) await serveOne(page, 'tap')
    expect(await coins(page)).toBeGreaterThanOrEqual(8)
    await page.getByRole('button', { name: 'Surt al carrer' }).click()
    await expect(page.getByTestId('street')).toBeVisible()

    await page.getByRole('button', { name: 'El meu armari' }).click()
    const wardrobe = page.getByRole('dialog', { name: 'L’armari' })
    await expect(wardrobe).toBeVisible()
    await wardrobe.getByRole('tab', { name: 'Complements' }).click()
    await wardrobe.getByRole('radio', { name: 'Corona, 60 monedes' }).click()
    await wardrobe.getByRole('button', { name: 'Compra Corona per 60 monedes' }).click()
    await expect(wardrobe.getByRole('status')).toHaveText('No tens prou monedes encara: fes encàrrecs!')
    await wardrobe.getByRole('radio', { name: 'Res', exact: true }).click()

    await wardrobe.getByRole('tab', { name: 'Roba de dalt' }).click()
    await wardrobe.getByRole('radio', { name: 'Samarreta de tirants, 8 monedes' }).click()
    await page.waitForTimeout(700)
    await shot(page, 'armari', project)
    const before = Number(/(\d+)/.exec((await wardrobe.getByLabel(/^\d+ monedes$/).getAttribute('aria-label')) ?? '')?.[1])
    await wardrobe.getByRole('button', { name: 'Compra Samarreta de tirants per 8 monedes' }).click()
    await expect(wardrobe.getByRole('status')).toContainText('Comprat!')
    await expect(wardrobe.getByLabel(`${before - 8} monedes`)).toBeVisible()
    await expect(wardrobe.getByRole('radio', { name: 'Samarreta de tirants', exact: true })).toHaveAttribute('aria-checked', 'true')
    await wardrobe.getByRole('button', { name: 'Fet!' }).click()
    await expect(wardrobe).toHaveCount(0)
    await expect.poll(() => coins(page)).toBe(before - 8)

    await page.reload()
    await expect(page.getByTestId('street')).toBeVisible()
    await page.getByRole('button', { name: 'El meu armari' }).click()
    await page.getByRole('dialog', { name: 'L’armari' }).getByRole('tab', { name: 'Roba de dalt' }).click()
    await expect(page.getByRole('radio', { name: 'Samarreta de tirants', exact: true })).toHaveAttribute('aria-checked', 'true')
    expect(consoleErrors).toEqual([])
  })

  test('reduced motion: instant transitions, the arrows still walk', async ({ page, consoleErrors }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await enterTown(page)
    const shop = page.getByRole('button', { name: 'Entra a la Botiga' })
    await expect(shop).toBeVisible()
    const before = (await shop.boundingBox())?.x ?? 0
    await page.getByRole('button', { name: 'Camina cap a la dreta' }).click()
    await expect.poll(async () => (await shop.boundingBox())?.x ?? 0).toBeLessThan(before)
    await page.getByRole('button', { name: 'Camina cap a l’esquerra' }).click()
    await shop.click()
    await expect(page.getByRole('region', { name: 'La Botiga', exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('street')).toHaveCount(0)
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })
})

freshTest.describe('El primer dia al poble', () => {
  freshTest('new player: name → character → welcome → the neighbours’ first errands → the street, with bubbles waiting and the jar of stars', async ({ page, consoleErrors }, testInfo) => {
    freshTest.setTimeout(120_000)
    await page.clock.setFixedTime(new Date(2026, 9, 9, 12, 0, 0))
    await createProfile(page)
    await page.waitForTimeout(500)
    await shot(page, 'primers-encarrecs', testInfo.project.name)
    const run = await completeDiagnostic(page)
    expect(run.scoreLeaks).toEqual([])
    await expect(page.getByText(`Hola, ${CHILD.name}!`)).toBeVisible()
    await page.waitForTimeout(900)
    await shot(page, 'primer-dia-carrer', testInfo.project.name)
    await expect(page.getByRole('button', { name: /^Tarro d’estrelles: \d+ %$/ })).toBeVisible()
    await expect.poll(() => page.locator('[data-testid^="street-hint-"]').count()).toBeGreaterThan(0)
    await expect(page.getByRole('button', { name: 'La Fleca: obrim aviat' })).toBeAttached()
    expect(consoleErrors).toEqual([])
  })
})
