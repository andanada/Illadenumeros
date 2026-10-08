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

/** Serves neighbours until one is solved with `method`. */
async function serveOne(page: Page, method: Method): Promise<void> {
  for (let tries = 0; tries < 25; tries++) {
    const call = page.getByRole('button', { name: 'Fes passar un veí' })
    if (await call.isVisible()) await call.click()
    if (await solveErrand(page, method)) {
      await expect(page.getByRole('button', { name: 'Adéu!' })).toBeVisible()
      await page.getByRole('button', { name: 'Adéu!' }).click()
      return
    }
    await page.getByRole('button', { name: 'Ara no' }).click()
  }
  throw new Error(`Cap encàrrec resolt amb ${method}`)
}

test.describe('El Poble dels Números', () => {
  test('pan the street, enter the shop, solve by drag and by tapping, earn coins', async ({ page, consoleErrors }, testInfo) => {
    await page.goto('/#/poble')
    const street = page.getByTestId('street')
    await expect(street).toBeVisible()
    await shot(page, 'carrer', testInfo.project.name)
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

    await shop.click()
    await expect(page.getByRole('region', { name: 'La Botiga', exact: true })).toBeVisible()
    await shot(page, 'botiga', testInfo.project.name)
    const start = await coins(page)

    await serveOne(page, 'drag')
    await expect.poll(() => coins(page)).toBeGreaterThan(start)
    const afterDrag = await coins(page)
    await serveOne(page, 'tap')
    await expect.poll(() => coins(page)).toBeGreaterThan(afterDrag)
    await shot(page, 'botiga-encarrec', testInfo.project.name)

    expect(await hasHorizontalScroll(page)).toBe(false)
    await page.getByRole('button', { name: 'Surt al carrer' }).click()
    await expect(street).toBeVisible()
    expect(consoleErrors).toEqual([])
  })

  test('reduced motion: instant transitions, the arrows still walk', async ({ page, consoleErrors }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/#/poble')
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
