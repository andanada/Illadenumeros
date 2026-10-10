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

const isLandscape = (page: Page): boolean => {
  const size = page.viewportSize()
  return !!size && size.width > size.height
}

/** The errand is above the fold; on landscape screens the place does not scroll at all. */
async function expectErrandFits(page: Page, submit: string): Promise<void> {
  await expect(page.getByTestId('errand-request')).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Ara no' })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Ajuda' })).toBeInViewport()
  await expect(page.getByRole('button', { name: submit })).toBeInViewport()
  if (isLandscape(page)) {
    const overflow = await page.evaluate(() => {
      const main = document.querySelector('main')
      return main ? main.scrollHeight - main.clientHeight : 0
    })
    expect(overflow).toBeLessThanOrEqual(1)
  }
}

async function expectNeighbourVisible(page: Page): Promise<void> {
  const stage = page.locator('[data-errand-kind]')
  const label = (await stage.getAttribute('aria-label')) ?? ''
  const name = label.replace(/^Encàrrec a [^:]+: /, '')
  expect(name.length).toBeGreaterThan(0)
  await expect(stage.getByRole('img', { name, exact: true })).toBeInViewport({ ratio: 0.4 })
}

/** Puts `n` items from `source` into `zone`. */
async function repeatMove(page: Page, method: Method, n: number, source: () => Locator, zone: () => Locator): Promise<void> {
  for (let i = 0; i < n; i++) await moveProp(page, method, source(), zone())
}

type Solver = (page: Page, method: Method, request: string) => Promise<boolean>

async function serveOne(page: Page, method: Method, solve: Solver, hooks: { asking?: () => Promise<void>; thanked?: () => Promise<void> } = {}): Promise<void> {
  for (let tries = 0; tries < 25; tries++) {
    const call = page.getByRole('button', { name: /^(Fes passar un client|Qui vol cuinar\? Fes passar un veí)$/ })
    if (await call.isVisible()) await call.click()
    await expect(page.locator('[data-errand-kind]')).toBeVisible()
    await hooks.asking?.()
    const request = (await page.getByTestId('errand-request').innerText()).replace(/\s+/g, ' ')
    if (await solve(page, method, request)) {
      await expect(page.getByRole('button', { name: 'Adéu!' })).toBeVisible()
      await hooks.thanked?.()
      await page.getByRole('button', { name: 'Adéu!' }).click()
      return
    }
    await page.getByRole('button', { name: 'Ara no' }).click()
  }
  throw new Error(`Cap encàrrec resolt amb ${method}`)
}

const solveBowl: Solver = async (page, method, request) => {
  const sum = /: (\d+) \+ (\d+) /.exec(request)
  const fill = /ja n’hi ha (\d+): .* = (\d+)\./.exec(request)
  const n = sum ? Number(sum[1]) + Number(sum[2]) : fill ? Number(fill[2]) - Number(fill[1]) : undefined
  if (n === undefined) return false
  await repeatMove(page, method, n, () => page.locator('[data-prop-kind="ingredient-pot"]'), () => page.locator('[data-zone-id="bol"]'))
  await page.getByRole('button', { name: 'Ja està!' }).click()
  return true
}

const solveClips: Solver = async (page, method, request) => {
  const pair = /: (\d+) \+ (\d+)\./.exec(request)
  const more = /Ja porto (\d+) \S+ i en vull (\d+)/.exec(request)
  const n = pair ? Number(pair[1]) + Number(pair[2]) : more ? Number(more[2]) - Number(more[1]) : undefined
  if (n === undefined) return false
  await repeatMove(page, method, n, () => page.locator('[data-prop-kind="pinca-caixa"]'), () => page.locator('[data-zone-id="safata-pinces"]'))
  await page.getByRole('button', { name: 'Ja està!' }).click()
  return true
}

test.describe('Casa i Perruqueria', () => {
  test('Casa: the kitchen errand by drag and by tap, then decorate: buy-free piece placed by drag, moved, persisted', async ({ page, consoleErrors }, testInfo) => {
    const project = testInfo.project.name
    await enterTown(page, [{ place: 'casa', count: 3, kind: 'repte', neighbour: 'senyora-pilar' }])
    await enterPlace(page, /^Entra a (la )?Casa$/i)
    await expect(page.getByRole('region', { name: 'La Casa', exact: true })).toBeVisible()
    await expect(page.getByTestId('door-queue')).toHaveAttribute('data-waiting', '0')
    const start = await coins(page)

    await serveOne(page, 'drag', solveBowl, {
      asking: async () => {
        await expectNeighbourVisible(page)
        await expectErrandFits(page, 'Ja està!')
        await page.waitForTimeout(1600)
        await shot(page, 'casa-cuina-encarrec', project)
      },
      thanked: async () => {
        await expect(page.getByTestId('errand-neighbour')).toHaveAttribute('data-pose', 'cheer')
        await page.waitForTimeout(450)
        await shot(page, 'casa-cuina-gracies', project)
      },
    })
    await expect.poll(() => coins(page)).toBeGreaterThan(start)
    const afterDrag = await coins(page)
    await serveOne(page, 'tap', solveBowl, {
      asking: async () => {
        await page.getByRole('button', { name: 'Ajuda' }).click()
        await expect(page.getByTestId('errand-hint')).toBeVisible()
        await page.waitForTimeout(800)
        await shot(page, 'casa-cuina-ajuda', project)
      },
    })
    await expect.poll(() => coins(page)).toBeGreaterThan(afterDrag)
    expect(await hasHorizontalScroll(page)).toBe(false)

    // Nobody is forced to stay: with no request waiting the place goes quiet and the bell is there; free play in the living room.
    await expect(page.getByRole('button', { name: /Fes passar un veí/ })).toBeVisible()
    await page.getByRole('button', { name: 'La sala' }).click()
    await shot(page, 'casa-sala', project)
    await page.getByRole('button', { name: 'Mobles', exact: true }).click()
    const catalogue = page.getByRole('region', { name: 'Catàleg de mobles' })
    await expect(catalogue).toBeVisible()
    await shot(page, 'casa-cataleg', project)
    const cushion = catalogue.locator('[data-prop-kind="moble-cataleg"]').first()
    const room = page.locator('[data-room="sala"]')
    const box = await room.boundingBox()
    if (!box) throw new Error('Sense sala')
    const before = await room.locator('[data-placed]').count()
    await dragToPoint(page, cushion, { x: box.x + box.width * 0.62, y: box.y + box.height * 0.6 })
    await expect(room.locator('[data-placed]')).toHaveCount(before + 1)
    await expect(page.getByRole('toolbar')).toBeVisible()
    await shot(page, 'casa-moble-triat', project)

    // Move it with the keyboard-friendly buttons, then reload: it stays where she left it.
    const placed = room.locator('[data-placed]').last()
    const at = await placed.boundingBox()
    await page.getByRole('button', { name: 'Mou-ho a la dreta' }).click()
    await expect.poll(async () => (await placed.boundingBox())?.x ?? 0).toBeGreaterThan((at?.x ?? 0) + 5)
    await page.getByRole('button', { name: 'Fet' }).click()
    await page.reload()
    await enterPlace(page, /^Entra a (la )?Casa$/i)
    // An errand is still on the board: the neighbour is in the kitchen until she lets them go.
    await page.getByRole('button', { name: 'Ara no' }).click()
    await page.getByRole('button', { name: 'La sala' }).click()
    await expect(page.locator('[data-room="sala"] [data-placed]')).toHaveCount(before + 1)
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })

  test('Casa: the bed makes it night and the lamp switches on', async ({ page, consoleErrors }, testInfo) => {
    await enterTown(page, [])
    await enterPlace(page, /^Entra a (la )?Casa$/i)
    await page.getByRole('button', { name: 'L’habitació' }).click()
    // The avatar walks to where she taps (far left), out of the bed's way.
    const avatar = page.getByTestId('casa-avatar')
    const x0 = (await avatar.boundingBox())?.x ?? 0
    await page.getByTestId('casa-terra').click({ position: { x: 12, y: 220 } })
    await expect.poll(async () => (await avatar.boundingBox())?.x ?? x0).toBeLessThan(x0 - 20)
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: 'Llit', exact: true }).click({ position: { x: 20, y: 30 } })
    await page.getByRole('button', { name: /A dormir/ }).click()
    await expect(page.getByTestId('casa-nit')).toBeVisible()
    await page.waitForTimeout(700)
    await shot(page, 'casa-nit', testInfo.project.name)
    await page.getByRole('button', { name: 'Bon dia!' }).click()
    await expect(page.getByTestId('casa-nit')).toHaveCount(0)
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })

  test('Perruqueria: clips by drag and by tap, then restyle the customer with the tools', async ({ page, consoleErrors }, testInfo) => {
    const project = testInfo.project.name
    await enterTown(page, [{ place: 'perruqueria', count: 3, kind: 'repte', neighbour: 'la-nuria' }])
    await enterPlace(page, /^Entra a (la )?Perruqueria$/i)
    await expect(page.getByRole('region', { name: 'La Perruqueria', exact: true })).toBeVisible()
    await expect(page.getByTestId('door-queue')).toHaveAttribute('data-waiting', '0')
    const start = await coins(page)

    await serveOne(page, 'drag', solveClips, {
      asking: async () => {
        await expectNeighbourVisible(page)
        await expectErrandFits(page, 'Ja està!')
        await page.waitForTimeout(1600)
        await shot(page, 'perruqueria-encarrec', project)
      },
      thanked: async () => {
        await expect(page.getByTestId('errand-neighbour')).toHaveAttribute('data-pose', 'cheer')
        await page.waitForTimeout(450)
        await shot(page, 'perruqueria-gracies', project)
      },
    })
    await expect.poll(() => coins(page)).toBeGreaterThan(start)
    const afterDrag = await coins(page)
    await serveOne(page, 'tap', solveClips, {
      asking: async () => {
        await page.getByRole('button', { name: 'Ajuda' }).click()
        await expect(page.getByTestId('errand-hint')).toBeVisible()
        await page.waitForTimeout(800)
        await shot(page, 'perruqueria-ajuda', project)
      },
    })
    await expect.poll(() => coins(page)).toBeGreaterThan(afterDrag)
    // Nobody is forced to stay: with no request waiting the salon goes quiet and the bell is there.
    await expect(page.getByRole('button', { name: /Fes passar un client/ })).toBeVisible()

    // Free play: drag the scissors, then the spray, onto the customer.
    const customer = page.locator('[data-zone-id="client-perruqueria"]')
    await expect(customer).toBeVisible()
    const head = page.getByRole('img', { name: 'La Fàtima, a la cadira' })
    const before = await head.innerHTML()
    await dragToPoint(page, page.getByRole('button', { name: 'les tisores' }), await centre(customer))
    await expect.poll(() => head.innerHTML()).not.toBe(before)
    await expect(page.getByText(/Cris, cris|Tallat/)).toBeVisible()
    await shot(page, 'perruqueria-tisores', project)
    await moveProp(page, 'tap', page.getByRole('button', { name: 'l’esprai de color' }), customer)
    await moveProp(page, 'tap', page.getByRole('button', { name: 'les pinces' }), customer)
    await page.waitForTimeout(500)
    await shot(page, 'perruqueria-joc-lliure', project)
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })
})
