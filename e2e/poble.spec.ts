import type { Locator, Page } from '@playwright/test'
import { expect, hasHorizontalScroll, seededTest as test, solve } from './helpers'

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

/** Opens the town; on the very first visit she makes her character first. */
async function enterTown(page: Page): Promise<void> {
  await page.goto('/#/poble')
  const creator = page.getByRole('region', { name: 'Crea el teu personatge' })
  const street = page.getByTestId('street')
  await expect(creator.or(street).first()).toBeVisible()
  if (await creator.isVisible()) await page.getByRole('button', { name: 'Fet!' }).click()
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

    await enterShop(page)
    await expect(page.getByTestId('door-queue')).toHaveAttribute('data-waiting', '2')
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
    expect(consoleErrors).toEqual([])
  })

  test('first visit: create the character, then the street; it is not asked again', async ({ page, consoleErrors }, testInfo) => {
    await page.goto('/#/poble')
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

  test('the map has a door to the town, and the town a way back', async ({ page, consoleErrors }, testInfo) => {
    await page.goto('/#/map')
    const card = page.getByRole('button', { name: 'El Poble (nou!)' })
    await card.scrollIntoViewIfNeeded()
    await shot(page, 'mapa', testInfo.project.name)
    await card.click()
    await expect(page).toHaveURL(/#\/poble$/)
    const creator = page.getByRole('region', { name: 'Crea el teu personatge' })
    await expect(creator.or(page.getByTestId('street')).first()).toBeVisible()
    if (await creator.isVisible()) await page.getByRole('button', { name: 'Fet!' }).click()
    await page.getByRole('button', { name: 'Mapa' }).click()
    await expect(page).toHaveURL(/#\/map$/)
    expect(consoleErrors).toEqual([])
  })

  test('L’armari: short of coins it says so kindly; with errand coins she buys a top, wears it, and it stays after reload', async ({ page, consoleErrors }, testInfo) => {
    const project = testInfo.project.name
    await enterTown(page)
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
    await expect(page.getByRole('region', { name: 'La Botiga', exact: true })).toBeVisible({ timeout: 2000 })
    await expect(page.getByTestId('street')).toHaveCount(0)
    expect(await hasHorizontalScroll(page)).toBe(false)
    expect(consoleErrors).toEqual([])
  })
})
